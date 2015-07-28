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
  user: string | User;

  id: string = ''; // room server ID
  session_id: string = ''; // session id, made for us if we don't make it (we don't)
  owner: string = ''; // username of the chatango user who owns this room
  ip: string = ''; // our IP
  server_time: number = 0; // unix time of the server, used in generating anonymous IDs
  here_now: number = 0; // number of people in the room (including anonymous/unnamed)
  moderators: util.Set<string> = new util.Set<string>(); // string array of moderator names. populated on connect (if we have the permission to see them)
  users: {[index: string]: User} = {};

  private _connection: Connection;
  private _history: Message.Cache;
  private _last_message: string;
  private _buffer: string = '';
  private _first_send: boolean = true;
  private _anonymous: boolean = false;

  private static TIMEOUT = 3000;

  constructor(name: string, user: string | User = '', options? : Room.Options) {
    super();

    this.name = name;
    this.user = user;

    if (typeof this.user === 'string' && this.user === '') {
      this._anonymous = true;
    }

    this._history = new Message.Cache({
      size: options && options.cache_size || 100
    });

    this._connection = new Connection(this._getServer());

    this._connection.on('data', this._receiveData.bind(this));

    this._connection.on('close', this._reset.bind(this));

    this.on('error', (err) => {
      winston.log('error', err);
      this._reset();
      throw err;
    });
  }

  private _bold: boolean = false;
  get bold(): boolean {
    if (this.user instanceof User) {
      return (<User>this.user).style.bold;
    }
    return this._bold;
  }
  set bold(val: boolean) {
    if (this.user instanceof User) {
      (<User>this.user).style.bold = val;
    }
    this._bold = val;
  }
  private _italics: boolean = false;
  get italics(): boolean {
    if (this.user instanceof User) {
      return (<User>this.user).style.italics;
    }
    return this._italics;
  }
  set italics(val: boolean) {
    if (this.user instanceof User) {
      (<User>this.user).style.italics = val;
    }
    this._italics = val;
  }
  private _underline: boolean = false;
  get underline(): boolean {
    if (this.user instanceof User) {
      return (<User>this.user).style.underline;
    }
    return this._underline;
  }
  set underline(val: boolean) {
    if (this.user instanceof User) {
      (<User>this.user).style.underline = val;
    }
    this._underline = val;
  }

  private _reset(): Room {
    this._buffer = '';
    this._first_send = true;
    return this;
  }

  private _send(command: string): Room;
  private _send(command: string[]): Room;
  private _send(command: any): Room {
    if (_.isArray(command)) {
      command = command.join(':');
    }
    winston.log('debug', `Sending request to room "${this.name}": "${command}"`);
    if (!this._first_send) {
      command += '\r\n';
    }
    this._first_send = false;
    command += '\0';
    this._connection.send(command);
    return this;
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
    winston.log('silly', `Received commands from room "${this.name}": ${commands}`);
    for (var i = 0; i < commands.length; i++) {
      var [command, ...args] = commands[i].split(':');
      winston.log('debug', `Received command from room "${this.name}": ${command}`);
      var handler = this[`__command__${command}`];
      if (handler === void 0) {
        winston.log('warn', `Received command that has no handler from room "${this.name}": <${command}>: ${args}`);
      }
      handler.apply(this, args);
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
    throw new Error(`Couldn't find host server for room ${room_name}`);
  }


  /**
   * Public Room commands
   */

  /**
   * Connect to a room
   * 
   * @fires connect
   */
  connect(): Promise<Room> {
    winston.log('verbose', `Joining room ${this.name}`);
    return this._connection
      .connect()
      // join room
      .then(() => {
        return new Promise<void>((resolve, reject) => {
          this.once('_init', resolve);
          this._send(`bauth:${this.name}:${this.session_id}::`);
        })
        .timeout(Room.TIMEOUT);
      })
      // authenticate to room
      .then(() => {
        if (this._anonymous)
          return;

        return new Promise<void>((resolve, reject) => {
          this.once('_auth', resolve);
          if (typeof this.user === 'string')
            return this._send(`blogin:${this.user}`);

          if (this.user instanceof User)
            return this._send(`blogin:${(<User>this.user).name}:${(<User>this.user).password}`);

          throw new Error(`Cannot join room as user "${this.user}"`);
        })
        .timeout(Room.TIMEOUT);
      })
      .then(() => {
        // add ourselves to the user list
        if (this.user instanceof User) {
          this.users[(<User>this.user).name] = <User>this.user;
        }
        // ask for the rest of the users
        return new Promise<void>((resolve, reject) => {
          this.once('_userlist', resolve);
          this._send('gparticipants');
        })
        .timeout(Room.TIMEOUT);
      })
      .then(() => {
        // make sure to initalize ourselves
        if (this.user instanceof User) {
          return (<User>this.user).init();
        }
      })
      .then(() => {
        if (this.user instanceof User && (<User>this.user).style.stylesOn) {
          this._send('msgbg:1');
        }
      })
      .then(() => {
        winston.log('info', `Joined room ${this.name}`);
        this.emit('connect', this);
        return this;
      })
      .timeout(Room.TIMEOUT);
  }

  /**
   * Leave a room
   * 
   * @fires disconnect
   */
  disconnect(): Promise<void> {
    winston.log('verbose', `Leaving room ${this.name}`);
    return this._connection.disconnect()
      .then(() => {
        winston.log('info', `Left room ${this.name}`);
        this._reset();
        this.emit('disconnect');
      });
  }

  /**
   * Send a message to the room
   * @param content - the message content
   */
  message(content: string): Room {
    this._last_message = content;

    content = _.escape(content);

    if (this.bold)
      content = `<b>${content}</b>`;
    if (this.italics)
      content = `<i>${content}</i>`;
    if (this.underline)
      content = `<u>${content}</u>`;

    content.replace('\n', '<br/>');

    var message;
    if (this.user instanceof User) {
      var {
        nameColor,
        fontSize,
        textColor,
        fontFamily
      } = (<User>this.user).style;
      message = `<n${nameColor}/><f x${fontSize}${textColor}="${fontFamily}">${content}`;
    }
    else if (typeof this.user === 'string' && !this._anonymous) {
      message = `${content}`;
    }
    else {
      message = `<n${String(this.server_time | 0).slice(-4)}/>${content}`;
    }

    this._send(['bm', Math.round(15e5 * Math.random()).toString(36), '0', message]);
    return this;
  }


  /**
   * Room command handlers
   * Data in the form of 'commands' from the Room connection is delegated to one of these functions
   * all parameters are always strings
   */

  /**
   * 'ok' command
   * received in response to sending a 'bauth' command
   * @param owner - The name of the User who created the Room
   * @param session_id - a session identifier delegated to us by Chatango
   * @param session_status - the status of the session_id [N = new, C = not new but not registered, M = not new and registered]
   * @param username - our name in the Room
   * @param server_time - Room's current unix server time
   * @param ip - our IP
   * @param moderators - semicolon-delineated list of a moderator and their permissions
   * @param server_id - ID of the server
   */
  __command__ok(owner: string, session_id: string, session_status: string, username: string, server_time: string, ip: string, moderators: string, server_id: string): void {
    this.owner = owner;
    this.session_id = session_id;
    this.ip = ip;
    this.id = server_id;
    this.server_time = parseFloat(server_time);
    if (moderators) {
      var mods = moderators.split(';');
      for (var i = 0, len = mods.length; i < len; i++) {
        // permissions is some integer that I will literally never figure out
        var [name, permissions] = mods[i].split(',');
        this.moderators.add(name);
      }
    }
    // we get our name here if we're connecting anonymously
    if (typeof this.user === 'string' && (<string>this.user).length === 0) {
      this.user = User.parseAnonName(`<n${session_id.slice(4, 8)}/>`, (this.server_time | 0).toString());
    }
  }

  /**
   * 'i' command
   * received in response to sending a 'bauth' request
   * represents one message in the Room's history of messages
   * received in reverse order
   */
  __command__i(): void {
    // var message = this._parseMessage.apply(this, arguments);
    // this._history.push(message);
    // this.emit('historyMessage', message); // move this, make special accomidations, reverse the list and publish it all
  }

  /**
   * 'nomore' command
   * received in response to sending a 'bauth' request
   * received if history message stream ends before 40 history messages
   */
  __command__nomore(): void {
    // noop
  }

  /**
   * 'inited' command
   * received in response to sending a 'bauth' request
   * signals the end of the history message stream, and that we have successfully initialized
   * @fires (internal) _init
   */
  __command__inited(): void {
    this.emit('_init');
  }

  /**
   * 'pwdok' command
   * received in response to sending a 'bauth' request
   * signals that the password for the registered user is correct, and that we have successfully authenticated
   * @fires (internal) _auth
   */
  __command__pwdok(): void {
    winston.log('info', `Successfully authenticated to room "${this.name}" as registered user "${this.user.toString()}"`);
    this.emit('_auth');
  }

  /**
   * 'aliasok' command
   * received in response to sending a 'bauth' request
   * signals that the temporary name we requested is available, and that we have successfully authenticated
   * @fires (internal) _auth
   */
  __command__aliasok(): void {
    winston.log('info', `Successfully authenticated to room "${this.name}" as temporary user "${this.user.toString()}"`);
    this.emit('_auth');
  }

  /**
   * 'n' command
   * received periodically
   * @param num_users - number of the users in the room, in hexidecimal
   */
  __command__n(num_users: string): void {
    this.here_now = parseInt(num_users, 16);
  }

  /**
   * 'b' command
   * received when a message is sent from anyone (including us)
   */
  __command__b(): void {
    var message = this._parseMessage.apply(this, arguments);
    this._history.push(message);
  }

  /**
   * 'u' command
   * received immediately after every 'b' command
   * maps message IDs with their actual IDs
   * I don't know why
   * @param old_id - the ID that the message was originally sent with
   * @param new_id - the ID that the message uses for deleting, etc.
   * @fires message
   */
  __command__u(old_id: string, new_id: string): void {
    var message = this._history.publish(old_id, new_id);
    winston.log('info', `Received message in room "${this.name}": ${message.toString()}`);
    this.emit('message', message);
  }

  /**
   * 'mods' command
   * received in response to any mod-editing request made by any user (removemod, addmod, updmod)
   * @param modlist - semicolon-delineated list of moderators and their permissions
   * @fires modUpdate
   */
  __command__mods(modlist: string): void {
    var mods = modlist.split(';');
    for (var i = 0, len = mods.length; i < len; i++) {
      var [name, permissions] = mods[i].split(',');
      this.moderators.add(name);
    }
    winston.log('verbose', `Received moderator information for room "${this.name}"`);
    this.emit('modUpdate');
  }

  /**
   * 'gparticipants' command
   * received in response to sending a 'gparticipants' request
   * @param num_unregistered - the number of unregistered users in the room
   * @param ...users - semicolon-delineated list of users
   * @fires (internal) _userlist
   */
  __command__gparticipants(num_unregistered: string, ...users: string[]): void {
    users = users.join(':').split(';');
    for (var i = 0, len = users.length; i < len; i++) {
      var user_string = users[i];
      if (user_string === '') { // no one here
        break;
      }
      var [
        id, // id unique to the connection
        joined_at, // unix join time
        session_id, // id unique to the first 8 digits of user's cookie-based session id
        name, // name of the registered user
        None // always 'None'?
      ] = user_string.split(':');
      name = name.toLowerCase();
      var user = this.users[name];
      if (user === void 0) {
        user = new User(name);
        this.users[name] = user;
        user.init();
        winston.log('debug', `First time seeing registered user "${name}"`);
      }
      user.joined_at = parseFloat(joined_at);
    }
    winston.log('verbose', `Received registered user information for room "${this.name}"`);
    this.emit('_userlist');
  }

  /**
   * 'participant' command
   * received periodically as users join and leave after receiving the 'gparticipants' command
   * @param status - [0 = leave, 1 = join], whether the event is a join or a leave event
   * @param id - the user's unique connection id
   * @param session_id - the user's unique session id
   * @param user_registered - [name, 'None'] name of the message sender (if registered)
   * @param user_temporary - [name, 'None'] name of the message sender (if using a temporary name)
   * @param no_idea - don't know, always empty string
   * @param joined_at - server time of the user joining
   * @fires join
   * @fires leave
   */
  __command__participant(status: string, id: string, session_id: string, user_registered: string, user_temporary: string, no_idea: string, joined_at: string): void {
    var user: string | User;
    if (user_registered === 'None' && user_temporary === 'None') {
      user = User.parseAnonName(`<n${session_id.slice(4, 8)}/>`, joined_at.slice(0, joined_at.indexOf('.')));
    }
    else if (user_temporary !== 'None') {
      user = user_temporary.toLowerCase();
    }
    else {
      user_registered = user_registered.toLowerCase();
      user = this.users[user_registered];
      if (user === void 0) {
        user = new User(user_registered);
        this.users[user_registered] = <User>user;
        winston.log('debug', `First time seeing registered user "${name}"`);
      }
    }
    if (status === '1') {
      if (user instanceof User) {
        (<User>user).joined_at = (<User>user).joined_at || parseFloat(joined_at);
        (<User>user).init();
      }
      this.emit('join', user);
    }
    else {
      this.emit('leave', user);
    }
  }

  /**
   * 'show_nlp' command
   * received when we send a message that was rejected due to spam detection
   * @fires flood_ban_warning
   */
  __command__show_nlp(): void {
    winston.log('warn', `Could not send the following message to room "${this.name}" as user "${this.user.toString()}" due to spam detection:\n${this._last_message}`);
    this.emit('flood_ban_warning');
  }

  /**
   * 'badalias' command
   * received in response to sending a 'bauth' request
   * received when we try to authenticate with a temporary name that is already taken
   * @fires error
   */
  __command__badalias(): void {
    this.emit('error', new Error(`Username "${this.user.toString()}" is invalid or already in use`));
  }

  /**
   * 'nlptb' command
   * received when we get flood banned
   * @fires flood_ban
   */
  __command__nlptb(): void {
    winston.log('warn', `Flood banned in room "${this.name}" as user "${this.user.toString()}"`);
    this.emit('flood_ban');
  }



  /**
   * Helpers
   */

  /**
   * helper for 'i' and 'b' commands
   * parses command arguments
   * @param created_at - server time of the message being sent
   * @param user_registered - [name, ''] name of the message sender (if registered)
   * @param user_temporary - [name, ''] name of the message sender (if using a temporary name)
   * @param user_session_id - session id of the message sender
   * @param user_id - (moderator only) unique identifier of the message sender, not the same as the user's connection id, seems to be a function of the user's session id
   * @param message_id - unique id of the message
   * @param user_ip - (moderator only) IP of the message sender
   * @param no_idea - don't know, sometimes 0, sometimes 8
   * @param no_idea2 - don't know, always empty string
   * @param ...raw_message - message body and tags, potentially split into pieces by previous .split()ing
   * @returns {Message} - the parsed Message object
   */
  private _parseMessage(created_at: string, user_registered: string, user_temporary: string, user_session_id: string, user_id: string, message_id: string, user_ip: string, no_idea: string, no_idea2: string, ...raw_message: string[]): Message {
    // rejoin message parts
    var raw = raw_message.join(':');
    var user: string | User;
    if (user_registered) {
      user_registered = user_registered.toLowerCase();
      user = this.users[user_registered];
      if (user === void 0) {
        user = new User(user_registered);
      }
      (<User>user)._ips.add(user_ip);
      (<User>user)._ids.add(user_id);
    }
    else if (user_temporary) {
      user = user_temporary
    }
    else {
      user = User.parseAnonName(raw, user_session_id);
    }
    var message = Message.parse(raw);
    message.id = message_id;
    message.room = this;
    message.user = user;
    message.created_at = parseFloat(created_at);
    return message;
  }

  /**
   * Events
   */

  /**
   * Message event
   * 
   * @event Room#message
   * @param {Message} message - the message that was received
   */

  /**
   * Join event
   * 
   * @event Room#join
   * @param {string | User} user - the user that joined
   */

  /**
   * Leave event
   * 
   * @event Room#leave
   * @param {string | User} user - the user that left
   */

  /**
   * Connect event
   * 
   * @event Room#connect
   * @param Room room - this room
   */

  /**
   * Disconnect event
   * 
   * @event Room#disconnect
   * @param Room room - this room
   */
}

module Room {
  export interface Options {
    cache_size: number;
  }
}


export = Room;
