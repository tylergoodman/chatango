/// <reference path="../typings/tsd.d.ts" />

import events = require('events');
import _ = require('lodash');
import Promise = require('bluebird');
import winston = require('winston');

import User = require('./User');
import Connection = require('./Connection');
import Message = require('./Message');
import util = require('./util');

class Room extends events.EventEmitter {
  name: string;
  user: User;
  private _connection: Connection;

  owner: string = ''; // username of the chatango user who owns this room
  session_id: string = ''; // session id, made for us if we don't make it (we don't)
  id: string = ''; // our unique identifier? useless so far
  moderators: util.Set<string> = new util.Set<string>(); // string array of moderator names. populated on connect (if we have the permission to see them)
  users: {[index: string]: User} = {};
  here_now: number; // number of people in the room (including anonymous/unnamed)
  server_time: number; // unix time of the server, used in generating anonymous IDs

  private _buffer: string = '';
  private _firstSend: boolean = true;

  private static TIMEOUT = 3000;

  constructor(name: string, user: User = new User) {
    super();

    this.name = name;
    this.user = user;

    this._connection = new Connection(this._getServer());

    this._connection.on('data', this._receiveData.bind(this));

    this._connection.on('close', this._reset.bind(this));

    this.on('error', (err) => {
      winston.log('error', err);
      this._reset();
      throw err;
    });
  }

  join(): Promise<Room> {
    winston.log('verbose', `Joining room ${this.name}`);
    return this._connection
      .connect()
      .then(() => {
        return new Promise<void>((resolve, reject) => {
          this.once('init', resolve);
          this._send(`bauth:${this.name}:${this.session_id}::`);
        })
        .timeout(Room.TIMEOUT);
      })
      .then(() => {
        return this._authenticate();
      })
      .then(() => {
        return new Promise<void>((resolve, reject) => {
          this.once('userlist', resolve);
          this._send('gparticipants');
        })
        .timeout(Room.TIMEOUT);
      })
      .then(() => {
        if (!this.user.hasInited) {
          return this.user.init();
        }
      })
      .then(() => {
        winston.log('info', `Joined room ${this.name}`);
        this.emit('join', this);
        return this;
      })
      .timeout(Room.TIMEOUT);
  }

  leave(): Promise<void> {
    winston.log('verbose', `Leaving room ${this.name}`);
    return this._connection.disconnect()
      .then(() => {
        winston.log('info', `Left room ${this.name}`);
        this._reset();
        this.emit('leave');
      });
  }

  private _reset(): Room {
    this._buffer = '';
    this._firstSend = true;
    this.users = {};
    return this;
  }

  changeUser(new_user: User): Promise<Room> {
    return this.leave().then(() => {
      this.user = new_user;
      return this.join();
    });
  }

  private _send(command: string): Room;
  private _send(command: string[]): Room;
  private _send(command: any): Room {
    if (_.isArray(command)) {
      command = command.join(':');
    }
    winston.log('verbose', `Sending command to room ${this.name}: "${command}"`);
    if (!this._firstSend) {
      command += '\r\n';
    }
    this._firstSend = false;
    command += '\0';
    this._connection.send(command);
    return this;
  }

  message(content: string): Room {
    content = _.escape(content);

    if (this.user.style.bold)
      content = `<b>${content}</b>`;
    if (this.user.style.italics)
      content = `<i>${content}</i>`;
    if (this.user.style.underline)
      content = `<u>${content}</u>`;

    content.replace('\n', '<br/>');

    var {
      nameColor,
      fontSize,
      textColor,
      fontFamily
    } = this.user.style;

    if (this.user.type === User.Type.Anonymous) {
      nameColor = String(this.server_time | 0).slice(-4);
    }

    var message = `<n${nameColor}/><f x${fontSize}${textColor}="${fontFamily}">${content}`;

    this._send(['bm', Math.round(15e5 * Math.random()).toString(36), '0', message]);
    return this;
  }

  private _authenticate(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (this.user.type === User.Type.Anonymous)
        return resolve();

      if (this.user.type === User.Type.Temporary)
        this._send(`blogin:${this.user.username}`);

      if (this.user.type === User.Type.Registered)
        this._send(`blogin:${this.user.username}:${this.user.password}`);

      this.once('auth', resolve);
    })
    .timeout(Room.TIMEOUT)
    .then(() => {
      this.users[this.user.username] = this.user;
    });
  }

  private _handleCommand(command: string, args: string[]): void {
    winston.log('debug', `Received <${command}> command from room ${this.name}`);
    switch (command) {
      case 'ok': // received in response to sending 'bauth' command
        (() => {
          var [
            owner, // owner of the room
            session_id, // session id (generated for us by Chatango because we didn't send any)
            session_status, // [N = new, C = not new but not registered, M = not new and registered] (will always be N for us)
            user_name, // our name in the chat (empty string since we authenticate later)
            server_time, // unix server time
            my_ip, // our IP
            moderators, // semicolon-delineated list of moderators and their permissions
            server_id // id of the server?
          ] = args;
          this.owner = owner;
          this.session_id = session_id; // possibly useless
          this.id = server_id; // also possibly useless
          this.server_time = parseFloat(server_id);
          if (moderators) {
            var mods = moderators.split(';');
            for (var i = 0, len = mods.length; i < len; i++) {
              // permissions is some integer that I will literally never figure out
              var [name, permissions] = mods[i].split(',');
              this.moderators.add(name);
            }
          }
          if (this.user.type === User.Type.Anonymous) {
            // TODO - un-hack this
            this.user.username = User.getAnonName(`<n${session_id.slice(4, 8)}/>`, (this.server_time | 0).toString());
          }
        })();
        break;
      case 'i': // on 'bauth', messages in immediate history (in reverse order)
        this.emit('history_message', this._parseMessage(args));
        break;
      case 'nomore': // emitted if there's history message stream ends before 40 history messages are sent (ie. there are less than 40 immediate history messages)
        break;
      case 'inited': // on 'bauth', after history messages stream ends
        this.emit('init');
        break;
      case 'pwdok': // on successful authentication
      case 'aliasok': // on successful temporary name registration
        winston.log('info', `Authenticated room ${this.name} as user ${this.user.username}`);
        this.emit('auth');
        break;
      case 'n': // periodically updated
        this.here_now = parseInt(args[0], 16);
        break;
      case 'b':
        // received when a message is sent from anyone (including self)
        // same as above, in 'i' command
        this.emit('message', this._parseMessage(args));
        break;
      case 'u':
        // received when a message is sent from anyone (including self)
        // not entirely sure what this is for, maybe multi-part messages sent with 'b' event? but they always fit in one frame
        break;
      case 'mods':
        (() => {
          var [moderators] = args;
          var mods = moderators.split(';');
          for (var i = 0, len = mods.length; i < len; i++) {
            var [name, permissions] = mods[i].split(',');
            this.moderators.add(name);
          }
        })();
        break;
      case 'gparticipants':
        // received when we toggle on receiving updates on the current users in the room
        // includes a list of users excluding anonymous
        (() => {
          var [
            num_anon_or_temp_users,
            ...users
          ] = args;
          users = users.join(':').split(';');
          for (var i = 0, len = users.length; i < len; i++) {
            var [
              dont_know,
              joined_at,
              session_id,
              user_registered,
              user_temporary
            ] = users[i].split(':');
            var name;
            if (user_registered === 'None') {
              name = user_temporary;
            }
            else {
              name = user_registered;
            }
            var user;
            // if we hit outselves, don't re-make ourselves
            if (name === this.user.username) {
              user = this.user;
            }
            else {
              user = new User(name, '', User.Type.Registered);
              this.users[user.username] = user;
            }
            user.session_ids.add(session_id);
            user.joined_at = parseInt(joined_at, 10);
          }
          this.emit('userlist', this.users);
        })();
        break;
      case 'show_nlp': // received when we send a message that was rejected due to spam detection
        winston.log('warn', 'Could not send previous message due to spam detection.');
        this.emit('flood_ban_warning');
        break;
      case 'badalias': // received when we try to register a temporary name that is already in use
        this.emit('error', new Error('Username is invalid or in use.'));
        break;
      case 'nlptb': // received when we get flood banned
        winston.log('warn', `Flood banned in room ${this.name} as ${this.user.username}`);
        this.emit('flood_ban');
        break;
      default: // catch and warn when we receive a command that we haven't accounted for
        winston.log('warn', `Received command that has no handler from room ${this.name}: <${command}>: ${args}`);
        break;
    }
  }

  private _receiveData(data: string): void {
    this._buffer += data;
    var commands: string[] = this._buffer.split('\0');
    if (commands[commands.length - 1] !== '') {
      this._buffer = commands.pop();
    }
    else {
      commands.pop();
      this._buffer = '';
    }
    winston.log('silly', `Received commands from room ${this.name}: ${commands}`);
    for (var i = 0; i < commands.length; i++) {
      var [command, ...args] = commands[i].split(':');
      this._handleCommand(command, args);
    }
  }

  private _parseMessage(args: string[]): Message {
    // TODO - look at these variables again with what you've learned from other commands
    var [
      created_at, // unix message creation time
      user_registered, // name of the message sender (if registered)
      user_temporary, // name of the message sender (if using a temporary name)
      user_session_id,
      user_id, // mod only, seems to be a function of the user_session_id
      message_id,
      user_ip, // mod only
      no_idea, // always 0?
      no_idea_always_empty,
      ...raw_message
    ] = args;
    var raw = raw_message.join(':');
    var name = user_registered || user_temporary;
    if (!name) {
      name = User.getAnonName(raw, user_session_id);
    }
    var message = Message.parse(raw);
    message.id = message_id;
    message.room = this;
    message.user = this.users[name] || name;
    message.created_at = parseInt(created_at, 10);
    return message;
  }

  private _getServer(room_name: string = this.name): string {
    // magic
    var tsweights: [string, number][] = [
      ['5', 75], ['6', 75], ['7', 75], ['8', 75], ['16', 75], ['17', 75], ['18', 75],
      ['9', 95], ['11', 95], ['12', 95], ['13', 95], ['14', 95], ['15', 95], ['19', 110],
      ['23', 110], ['24', 110], ['25', 110], ['26', 110], ['28', 104], ['29', 104], ['30', 104],
      ['31', 104], ['32', 104], ['33', 104], ['35', 101], ['36', 101], ['37', 101], ['38', 101],
      ['39', 101], ['40', 101], ['41', 101], ['42', 101], ['43', 101], ['44', 101], ['45', 101],
      ['46', 101], ['47', 101], ['48', 101], ['49', 101], ['50', 101], ['52', 110], ['53', 110],
      ['55', 110], ['57', 110], ['58', 110], ['59', 110], ['60', 110], ['61', 110], ['62', 110],
      ['63', 110], ['64', 110], ['65', 110], ['66', 110], ['68', 95], ['71', 116], ['72', 116],
      ['73', 116], ['74', 116], ['75', 116], ['76', 116], ['77', 116], ['78', 116], ['79', 116],
      ['80', 116], ['81', 116], ['82', 116], ['83', 116], ['84', 116]
    ];

    room_name = room_name.replace('_', 'q').replace('-', 'q');

    var fnv = parseInt(room_name.slice(0, _.min([room_name.length, 5])), 36);
    var lnv: any = room_name.slice(6, 6 + _.min([room_name.length - 5, 3]));
    if (lnv) {
      lnv = parseInt(lnv, 36);
      if (lnv < 1000)
        lnv = 1000;
    }
    else
      lnv = 1000;

    var num = (fnv % lnv) / lnv;
    var maxnum = _.sum(tsweights.map((n) => { return n[1]; }));
    var cumfreq = 0;
    for (var i = 0; i < tsweights.length; i++) {
      var weight: [string, number] = tsweights[i]; 
      cumfreq += weight[1] / maxnum;
      if (num <= cumfreq) {
        return `s${weight[0]}.chatango.com`;
      }
    }
    throw new Error(`Couldn't find host server for room name ${room_name}`);
  }
}

export = Room;