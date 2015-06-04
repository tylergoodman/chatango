/// <reference path="../typings/node/node.d.ts" />
/// <reference path="../typings/lodash/lodash.d.ts" />
/// <reference path="../typings/bluebird/bluebird.d.ts" />
/// <reference path="../typings/winston/winston.d.ts" />

import events = require('events');
import util = require('util');
import _ = require('lodash');
import Promise = require('bluebird');
import winston = require('winston');

import User = require('./User');
import Connection = require('./Connection');
import Message = require('./Message');

class Room extends events.EventEmitter {
  name: string;
  user: User;
  private _connection: Connection;

  owner: string = ''; // username of the chatango user who owns this room
  sessionid: string = ''; // session id, made for us if we don't make it (we don't)
  id: string = ''; // our unique identifier? useless so far
  moderators: string[] = []; // string array of moderator names. populated on connect (if we have the permission to see them)
//  users: User[];
  here_now: number; // number of people in the room
  server_time: number; // unix time of the server, used in generating anonymous IDs

  private _buffer: string = '';
  private _firstSend: boolean = true;

  constructor(name: string, user: User = new User) {
    super();

    this.name = name;
    this.user = user;

    this._connection = new Connection(this._getServer());

    this._connection.on('data', this._receiveData.bind(this));

    this._connection.on('connect', () => {
      winston.log('info', `Connected to room ${this.name}`);
    });

    this._connection.on('close', () => {
      winston.log('info', `Disconnected from room ${this.name}`);
      this._buffer = '';
      this._firstSend = true;
      this.emit('leave');
    });

    this.on('error', (err) => {
      winston.log('error', err);
      throw err;
    });
  }

  join(): Promise<void> {
    winston.log('verbose', `Connecting to room ${this.name}`);
    return this._connection
      .connect()
      .then(() => {
        return new Promise<void>((resolve, reject) => {
          this.once('init', resolve);
          this.send(`bauth:${this.name}:${this.sessionid}::`);
        });
      })
      .timeout(750)
      .then(() => {
        return this._authenticate();
      })
      .then(() => {
        if (!this.user.hasInited && this.user.type !== User.Type.Anonymous) {
          return this.user.init();
        }
      });
  }

  leave(): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      winston.log('verbose', `Disconnecting from room ${this.name}`);
      this._connection.disconnect();
      this._connection.once('close', resolve);
    });
  }

  send(command: string): Room;
  send(command: string[]): Room;
  send(command: any): Room {
    if (_.isArray(command)) {
      command = command.join(':');
    }
    if (!this._firstSend) {
      command += '\r\n';
    }
    this._firstSend = false;
    command += '\0';
    winston.log('verbose', `Sending command to room ${this.name}: "${command}"`);
    this._connection.send(command);
    return this;
  }

  sendMessage(content: string): Room {
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

    this.send(['bm', Math.round(15E5 * Math.random()).toString(36), '0', message]);
    return this;
  }

  private _authenticate(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (this.user.type === User.Type.Anonymous)
        return resolve();

      if (this.user.type === User.Type.Temporary)
        this.send(`blogin:${this.user.username}`);

      if (this.user.type === User.Type.Registered)
        this.send(`blogin:${this.user.username}:${this.user.password}`);

      this.once('join', resolve);
    })
    .timeout(750);
  }

  private _handleCommand(command: string, args: string[]): void {
    winston.log('debug', `Received <${command}> command from room ${this.name}`);
    switch (command) {
      case 'ok': // on 'bauth'
        (() => {
          var [
            owner, // owner of the room
            sessionid, // session id (generated for us by Chatango because we didn't send any)
            session_status, // [N = new, C = not new but not registered, M = not new and registered] (will always be N for us)
            user_name, // our name in the chat (empty string since we authenticate later)
            server_time, // unix server time
            my_ip, // our IP
            moderators, // semicolon-delineated list of moderators and their permissions
            server_id // id of the server?
          ] = args;
          this.owner = owner;
          this.sessionid = sessionid; // possibly useless
          this.id = server_id; // also possibly useless
          this.server_time = parseFloat(server_id);
          if (moderators) {
            var mods = moderators.split(';');
            for (var i = 0, len = mods.length; i < len; i++) {
              // permissions is some integer that I will literally never figure out
              var [name, permissions] = mods[i].split(',');
              if (this.moderators.indexOf(name) === -1) {
                this.moderators.push(name);
              }
            }
          }
          if (this.user.type === User.Type.Anonymous) {
            this.user.username = User.getAnonName(`<n${sessionid.slice(4, 8)}/>`, String(this.server_time | 0));
          }
        })();
        break;
      case 'i': // on 'bauth', messages in immediate history (in reverse order)
        (() => {
          var [
            created_at, // unix message creation time
            user_registered, // name of the message sender (if registered)
            user_temporary, // name of the message sender (if using a temporary name)
            user_id,
            user_id_mod_only,
            message_id,
            user_ip,
            no_idea, // always 0?
            no_idea_always_empty,
            ...raw_message
          ] = args;
          var message = Message.parse(raw_message.join(':'));
          var name = user_registered || user_temporary;
          if (!name) {
            name = User.getAnonName(raw_message.join(':'), user_id);
          }
          this.emit('history_message', name, message);
        })();
        break;
      case 'nomore': // emitted if there's history message stream ends before 40 history messages are sent (ie. there are less than 40 immediate history messages)
        break;
      case 'inited': // on 'bauth', after history messages stream ends
        this.emit('init');
        break;
      case 'pwdok': // on successful authentication
      case 'aliasok': // on successful temporary name registration
        this.emit('join');
        break;
      case 'n': // periodically updated
        this.here_now = parseInt(args[0], 16);
        break;
      case 'b': // received when a message is sent from anyone (including self)
        (() => {
          var [
            created_at,
            user_registered,
            user_temporary,
            user_id,
            user_id_mod_only,
            message_id,
            user_ip,
            no_idea,
            no_idea_always_empty,
            ...raw_message
          ] = args;
          var message = Message.parse(raw_message.join(':'));
          var name = user_registered || user_temporary;
          if (!name) {
            name = User.getAnonName(raw_message.join(':'), user_id);
          }
          this.emit('message', name, message);
        })();
        break;
      case 'u': // received when a message is sent from anyone (including self)
        // not entirely sure what this is for, maybe multi-part messages sent with 'b' event? but they always fit in one frame
        (() => {
          var [
            message_id,
          ] = args;
        })();
        break;
      case 'mods':
        (() => {
          var [moderators] = args;
          var mods = moderators.split(';');
          for (var i = 0, len = mods.length; i < len; i++) {
            var [name, permissions] = mods[i].split(',');
            if (this.moderators.indexOf(name) === -1) {
              this.moderators.push(name);
            }
          }
        })();
        break;
      case 'show_nlp':
        winston.log('warn', 'Could not send previous message due to spam detection.');
        this.emit('flood_ban_warning');
        break;
      case 'badalias':
        this.emit('error', new Error('Username is invalid or in use.'));
        break;
      case 'nlptb':
        winston.log('warn', `Flood banned in room ${this.name} as ${this.user.username}`);
        this.emit('flood_ban');
        break;
      default:
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