import { Socket } from 'net';
import { EventEmitter } from 'events';
import { sum, assign, escape } from 'lodash';
import * as Promise from 'bluebird';
import * as Debug from 'debug';

const log = Debug('chatango:Room:log');
const warn = Debug('chatango:Room:warn');
const error = Debug('chatango:Room:error');
const debug = Debug('chatango:Room:debug');

import User from './User';
import Message, { MessageCache } from './Message';

/**
 * Room class
 * manages all chatroom-related tasks
 */

/**
 * Events
 */

/**
 * Message event
 * fired when the Room receives a message
 * @event Room#message
 * @param {Message} message - the message that was received
 */

/**
 * Join event
 * fired when a user joins the room
 * @event Room#join
 * @param {User} user - the user that joined
 */

/**
 * Leave event
 * fired when a user leaves the room
 * @event Room#leave
 * @param {User} user - the user that left
 */

/**
 * Connect event
 * fired when we join the room
 * @event Room#connect
 * @param Room room - this room
 */

/**
 * Disconnect event
 * fired when we leave the room
 * @event Room#disconnect
 * @param Room room - this room
 */

/**
 * Spam Ban Warning event
 * fired when we are warned for sending messages that are too similar too quickly
 * @event Room#spam_ban_warning
 */

/**
 * Spam Ban event
 * fired when we are spam banned
 * @event Room#spam_ban
 */

/**
 * Flood Ban Warning event
 * fired when we are warned for sending messages too quickly
 * @event Room#flood_ban_warning
 */

/**
 * Flood Ban event
 * fired when we are flood banned
 * @event Room#flood_ban
 */

/**
 * Message Delete event
 * fired when a message is deleted
 * @event Room#message_delete
 * @param Message | void message - the deleted message (if still in cache, undefined otherwise)
 */

/**
 * Ban event
 * fired when someone in the room is banned
 * received only as moderator
 * see __command__blocked for more info
 * @event Room#ban
 * @param {id, ip, name, server_time} - banned user info
 */

/**
 * Unban event
 * fired when someone in the room is unbanned
 * received only as moderator
 * see __command__unblocked for more info
 * @event Room#ban
 * @param {id, ip, name, server_time} - unbanned user info
 */

/**
 * Mod update event
 * fired when modlist is updated
 * received only as moderator
 * @event Room#mod_update
 */

export interface RoomOptions {
  auto_reconnect?: boolean;
  message_cache_size?: number;
};

export class Room extends EventEmitter implements RoomOptions {

  // Room Data
  name: string;
  user: User;
  hostname: string; // server hostname
  id: string; // room server ID
  session_id: string; // session id, made for us if we don't make it (we don't)
  owner: string; // username of the chatango user who owns this room
  ip: string; // our IP
  server_time: number; // unix time of the server, used in generating anonymous IDs
  here_now: number; // number of people in the room (including anonymous/unnamed)
  moderators: Set<string> = new Set<string>(); // set of moderator names. populated on connect (if we have the permission to see them)
  users: {[index: string]: User} = {};

  // Options
  auto_reconnect: boolean;
  message_cache_size: number;

  // Internals
  private _socket: Socket;
  private _ping: number;
  private _buffer: string = '';
  private _first_send: boolean = true;
  private _disconnecting: boolean = false;
  private _connecting: boolean = false;
  private _history: MessageCache;
  private _last_message: string;

  private static TIMEOUT = 5000;
  private static RECONNECT_DELAY = 10000;
  private static PING_TIMEOUT = 20000;
  private static PORT = 443;
  private static COMMAND_PREFIX = '__command__';
  private static DEFAULT_OPTIONS: RoomOptions = {
    auto_reconnect: true,
    message_cache_size: 100,
  };

  get identifier(): string {
    return `${this.user}@${this.name}`;
  }

  /**
   * Get chatango server hostname from room name
   * taken from ch.py - https://github.com/Nullspeaker/ch.py
   */
  static getHostname(room_name: string): string {
    // magic
    const tsweights: [string, number][] = [
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

    const fnv = parseInt(room_name.slice(0, Math.min(room_name.length, 5)), 36);
    let lnv: any = room_name.slice(6, 6 + Math.min(room_name.length - 5, 3));
    if (lnv) {
      lnv = parseInt(lnv, 36);
      if (lnv < 1000) {
        lnv = 1000;
      }
    }
    else {
      lnv = 1000;
    }

    const num = (fnv % lnv) / lnv;
    const maxnum = sum(tsweights.map((n) => { return n[1]; }));
    let cumfreq = 0;
    for (let i = 0; i < tsweights.length; i++) {
      const weight: [string, number] = tsweights[i];
      cumfreq += weight[1] / maxnum;
      if (num <= cumfreq) {
        return `s${weight[0]}.chatango.com`;
      }
    }
    const err_message = `Couldn't find host server for room ${room_name}`;
    error(err_message);
    throw new Error(err_message);
  }

  constructor(name: string, user: User = new User(), options?: RoomOptions) {
    super();

    this.name = name;
    this.user = user;
    this.hostname = Room.getHostname(this.name);
    assign(this, Room.DEFAULT_OPTIONS, options);

    this._history = new MessageCache({
      size: this.message_cache_size,
    });

    this._initSocket();
  }

  /**
   * Socket handlers
   */
  private _initSocket(): void {
    const socket = new Socket;
    socket.setEncoding('utf8');
    socket.on('close', (had_error) => this._handleClose(had_error));
    socket.on('connect', () => this._handleConnect());
    socket.on('data', (data) => this._handleData(data));
    socket.on('drain', () => this._handleDrain());
    socket.on('end', () => this._handleEnd());
    socket.on('error', (err) => this._handleError(err));
    socket.on('lookup', (err, address, family) => this._handleLookup(err, address, family));
    this._socket = socket;
  }

  private _handleClose(had_error): void {
    this.emit('_close', had_error);
    this._reconnect(); // AYYLMAO
  }

  private _handleData(data: string): void {
    this._buffer += data;
    debug(`Received data from ${this.identifier}`, new Buffer(this._buffer));
    let commands = this._buffer.split('\0');
    if (commands[commands.length - 1] !== '') {
      this._buffer = commands.pop();
    }
    else {
      commands.pop();
      this._buffer = '';
    }
    // debug(`Received commands from room "${this.name}": ${commands}`);
    for (let i = 0, len = commands.length; i < len; i++) {
      const [command, ...args] = commands[i].split(':');
      if (command === '') { // pong
        continue;
      }
      debug(`Received command from ${this.identifier}: ${command}: ${args.join(':')}`);
      const handler = this[`${Room.COMMAND_PREFIX}${command}`];
      if (handler === undefined) {
        warn(`Received command that has no handler from ${this.identifier}: <${command}>: ${args}`);
      }
      else {
        handler.apply(this, args);
      }
    }
  }

  private _handleDrain(): void {
    debug(`Socket drained ${this.name}@${this.hostname}`);
  }

  private _handleConnect(): void {
    this.emit('_connect');
  }

  private _handleEnd(): void {
    log(`Received FIN packet from ${this.name}@${this.hostname}`);
    // this.emit('_close');
  }

  private _handleError(err: Error): void {
    error(`Error on connection to ${this.name}@${this.hostname}: ${err}`);
  }

  private _handleLookup(err: void | Error, address: string, family: void | string): void {
    if (err) {
      error(`Error looking up ${this.name}@${this.hostname}: ${err}`);
    }
    else {
      debug(`Socket lookup ${this.name}@${this.hostname}`, address, family);
    }
  }

  /**
   * End of socket handlers
   */

  /**
  * Private methods
  */

  /**
   * Pinging functions
   * Chatango requires a ping or it'll timeout in 3 minutes
   */
  private _startPing(): void {
    debug(`starting ping ${this.identifier}`);
    this._ping = setInterval(() => this._send('', false), Room.PING_TIMEOUT);
  }

  private _stopPing(): void {
    debug(`stopping ping ${this.identifier}`);
    clearInterval(this._ping);
    this._ping = undefined;
  }

  private _resetPing(): void {
    this._stopPing();
    this._startPing();
  }

  /**
   * Resetting
   */
   private _reconnect(): void {
     if (this.auto_reconnect && !this._connecting && !this._disconnecting) {
       log(`Reconnecting to ${this.name}@${this.hostname} in ${Room.RECONNECT_DELAY}ms`);
       setTimeout(() => {
         log(`Reconnecting to ${this.name}@${this.hostname}...`);
         this._reset();
         this.connect();
       }, Room.RECONNECT_DELAY);
     }
   }

   private _reset(): void {
     this.users = {};
     this.moderators = new Set<string>();

     this._stopPing();
     this._buffer = '';
     this._first_send = true;
     this._disconnecting = false;
     this._connecting = false;
   }

  /**
   * Send a request to a room
   * @param request - request with comma-delineated arguments, or an array of the command followed by its arguments
   * @param restartPing - flag indicating whether to restart the pinging interval
   */
  private _send(request: string | string[], restartPing: boolean = true): void {
    if (Array.isArray(request)) {
      request = (<string[]>request)
        .map((arg) => arg === undefined ? '' : arg)
        .join(':');
    }
    debug(`Sending request to ${this.identifier}: "${request}"`);
    if (!this._first_send) {
      request += '\r\n';
    }
    this._first_send = false;
    request += '\0';
    if (restartPing) {
      this._resetPing();
    }
    this._socket.write(request);
  }

  /**
   * Get room users
   */
  private _userlist_get(): Promise<void> {
    debug(`Getting userlist for ${this.identifier}`);
    // we always have our name at this point
    this.users[this.user.name] = this.user;
    return new Promise<void>((resolve, reject) => {
      this.once('_userlist', resolve);
      this._send('gparticipants');
    })
    .timeout(Room.TIMEOUT, `timed out while waiting for userlist command from ${this.identifier}`)
    .then(() => {
      debug(`Got userlist for ${this.identifier}`);
    });
  }

  /**
   * Login to a room
   */
   private _auth(): Promise<void> {
     log(`Authenticating ${this.identifier}`);
     if (this.user.type === User.Types.Anon) {
       return Promise.resolve();
     }
     return new Promise<void>((resolve, reject) => {
       this.once('_auth', resolve);
       if (this.user.type === User.Types.Temp) {
         this._send(`blogin:${this.user.name}`);
       }
       else {
         this._send(`blogin:${this.user.name}:${this.user.password}`);
       }
     })
     .timeout(Room.TIMEOUT, `timed out while waiting for auth command from ${this.identifier}`)
     .then(() => {
       log(`Authenticated ${this.identifier}`);
     });
   }

  /**
   * Join a room after connecting
   * @fires join
   */
  private _join(): Promise<void> {
    log(`Joining ${this.user || 'anonymous'}@${this.name}`);
    return new Promise<void>((resolve, reject) => {
      this.once('_init', resolve);
      this._send(['bauth', this.name, this.session_id, '', '']);
    })
    .timeout(Room.TIMEOUT, `timed out while waiting for init command from ${this.identifier}`)
    .then(() => {
      return this._auth();
    })
    .then(() => {
      return this._userlist_get();
    })
    .then(() => {
      return this.user._inited;
    })
    .then(() => {
      if (this.user.style.stylesOn) {
        this._send('msgbg:1');
      }
    })
    .then(() => {
      log(`Joined ${this.identifier}`);
    });
  }

  /**
  * End of private methods
  */

  /**
   * Public methods
   */

  /**
   * Connect to a room
   * @fires connect
   */
  connect(port: number = Room.PORT, connectListener?: Function): Promise<Room> {
    log(`Connecting to ${this.name}@${this.hostname}`);
    this._connecting = true;
    return new Promise<void>((resolve, reject) => {
      this.once('_connect', resolve);
      this._socket.connect(port, this.hostname, connectListener);
    })
    .timeout(Room.TIMEOUT, `Timed out while connecting to ${this.name}@${this.hostname}`)
    .then(() => {
      log(`Connected to ${this.name}@${this.hostname}`);
      return this._join();
    })
    .then(() => {
      this._connecting = false;
      this._startPing();
      this.emit('connect', this);
      return this;
    })
    .catch((err) => {
      error(err);
      this.removeAllListeners('_connect');
      return this.connect();
    });
  }

  /**
   * Leave a room
   * @fires disconnect
   */
  disconnect(): Promise<Room> {
    log(`Disconnecting from ${this.identifier}`);
    this._disconnecting = true;
    return new Promise((resolve, reject) => {
      this.once('_close', resolve);
      this._socket.end();
    })
    .timeout(Room.TIMEOUT, `Timed out while disconnecting from ${this.identifier}`)
    .catch((err) => {
      error(err);
      this.removeAllListeners('_close');
      return new Promise((resolve, reject) => {
        this.once('_close', resolve);
        this._socket.destroy();
      });
    })
    .then((had_error: boolean) => {
      if (had_error) {
        error(`Disconnected from ${this.identifier}`);
      }
      else {
        log(`Disconnected from ${this.identifier}`);
      }
      this._disconnecting = false;
      this.emit('disconnect', this)
      return this;
    })
  }


  /**
   * Send a message to the room
   * @param content - the message content
   */
  message(content: string): Room {
    this._last_message = content;

    content = escape(content);
    content = content.replace(/\n/g, '<br/>');

    let message;
    if (this.user.type === User.Types.Regi) {
      const {
        nameColor,
        fontSize,
        textColor,
        fontFamily
      } = this.user.style;
      if (this.user.style.bold)
        content = `<b>${content}</b>`;
      if (this.user.style.italics)
        content = `<i>${content}</i>`;
      if (this.user.style.underline)
        content = `<u>${content}</u>`;
      message = `<n${nameColor}/><f x${fontSize}${textColor}="${fontFamily}">${content}`;
    }
    else if (this.user.type === User.Types.Temp) {
      message = `${content}`;
    }
    else {
      message = `<n${String(this.server_time | 0).slice(-4)}/>${content}`;
    }

    // more magic
    this._send(['bm', Math.round(15e5 * Math.random()).toString(36), '0', message]);
    return this;
  }

  /**
   * Delete a message
   * @param message - the message object to delete
   */
  delete(message: Message): Room {
    this._send(['delmsg', message.id]);
    return this;
  }

  /**
   * Delete all messages by a user
   * @param user - the user's ID, or a message sent by the user
   */
  deleteAll(user: Message | User): Room {
    let id: string, ip: string, name: string;
    if (user instanceof User) {
      ({ id, ip, name } = user);
    }
    else {
      ({ id, ip, name } = (<Message>user).user);
    }
    this._send(['delallmsg', id, ip, name]);
    return this;
  }

  /**
   * Ban a user
   * can only be sent after we view a message made by the user
   * @param user - the User, or a Message sent by the user
   */
  ban(user: Message | User): Room {
    let id: string, ip: string, name: string;
    if (user instanceof User) {
      ({ id, ip, name } = user);
    }
    else {
      ({ id, ip, name } = (<Message>user).user);
    }
    this._send(['block', id, ip, name]);
    return this;
  }

  /**
   * Unban a user
   * @param user - the User, or a Message sent by the user
   */
  unban(user: Message | User): Room {
    let id: string, ip: string, name: string;
    if (user instanceof User) {
      ({ id, ip } = user);
    }
    else {
      ({ id, ip } = (<Message>user).user);
    }
    this._send(['removeblock', id, ip]);
    return this;
  }

  /**
   * End of public methods
   */

  /**
   * Room command handlers
   * Data in the form of 'commands' from the Room connection is delegated to one of these functions
   * all parameters are always strings
   */

  /**
   * 'ok' command
   * received in response to sending a 'bauth' request
   * @param owner - The name of the User who created the Room
   * @param session_id - a session identifier delegated to us by Chatango
   * @param session_status - the status of the session_id [N = new, C = not new and not registered, M = not new and registered]
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
      const mods = moderators.split(';');
      for (let i = 0, len = mods.length; i < len; i++) {
        // permissions is some integer that I will literally never figure out
        const [name, permissions] = mods[i].split(',');
        this.moderators.add(name);
      }
    }
    // we get our name here if we're connecting anonymously
    if (this.user.type === User.Types.Anon) {
      this.user.name = User.parseAnonName(`<n${session_id.slice(4, 8)}/>`, (this.server_time | 0).toString());
    }
  }

  /**
   * 'i' command
   * received in response to sending a 'bauth' request
   * represents one message in the Room's history of messages
   * received in reverse order
   */
  __command__i(): void {
    // do nothing because we don't care about messages sent before we connect
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
    debug(`Successfully authenticated to room "${this.name}" as registered user "${this.user}"`);
    this.emit('_auth');
  }

  /**
   * 'aliasok' command
   * received in response to sending a 'bauth' request
   * signals that the temporary name we requested is available, and that we have successfully authenticated
   * @fires (internal) _auth
   */
  __command__aliasok(): void {
    debug(`Successfully authenticated to room "${this.name}" as temporary user "${this.user}"`);
    this.emit('_auth');
  }

  /**
   * 'relogin' command
   * received in response to sending a 'bauth' request that fails
   * @fires (internal) _auth
   */
  __command__relogin(): void {
    // noop
  }

  /**
   * 'denied' command
   * received after a failure to respond to 'relogin' command
   * @fires (internal) _auth
   */
  __command__denied(): void {
    // noop
  }

  /**
   * 'badlogin' command
   * received when login credentials fail
   */
  __command__badlogin(): void {
    throw new Error(`Failed to join ${this.identifier} with password "${this.user.password}": invalid credentials`);
  }

  /**
   * 'n' command
   * received whenever a user join or leaves
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
    const message = this._history.submit(this._parseMessage.apply(this, arguments));
    if (message) {
      log(`Received message for room ${this.identifier} => ${(<Message>message).toString()}`);
      this.emit('message', message);
      (<Message>message).user.emit('message', message);
    }
  }

  /**
   * 'u' command
   * received with every 'b' command
   * maps message IDs with their actual IDs
   * I don't know why
   * @param old_id - the ID that the message was originally sent with
   * @param new_id - the ID that the message uses for deleting, etc.
   * @fires message
   */
  __command__u(old_id: string, new_id: string): void {
    const message = this._history.publish(old_id, new_id);
    if (message) {
      log(`Received message for room ${this.identifier} => ${(<Message>message).toString()}`);
      this.emit('message', message);
      (<Message>message).user.emit('message', message);
    }
  }

  /**
   * 'mods' command
   * received in response to any mod-editing request made by any user (removemod, addmod, updmod)
   * @param modlist - semicolon-delineated list of moderators and their permissions
   * @fires mod_update
   */
  __command__mods(modlist: string): void {
    this.moderators.clear();
    const mods = modlist.split(';');
    for (let i = 0, len = mods.length; i < len; i++) {
      const [
        name, // name of the moderator user
        permissions // integer represnting the permissions of the moderator?
      ] = mods[i].split(',');
      this.moderators.add(name);
    }
    debug(`Received moderator information for ${this.identifier}`);
    this.emit('mod_update');
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
    for (let user_str of users) {
      if (user_str === '') { // no one here
        break;
      }
      const [
        connection_id, // id unique to the connection
        joined_at, // unix join time
        session_id, // id unique to the first 8 digits of user's cookie-based session id
        name, // name of the registered user
        None, // always 'None'?
        empty // always empty
      ] = user_str.split(':');
      let user = this.users[name.toLowerCase()];
      if (user === undefined) {
        user = new User(name);
        this.users[user.name] = user;
        debug(`First time seeing registered user "${user}"@${this.name}`);
      }
      user._connection_ids.add(connection_id);
      user.joined_at = parseFloat(joined_at);
    }
    debug(`Received registered user information for ${this.identifier}`);
    this.emit('_userlist');
  }

  /**
   * 'participant' command
   * received periodically as users join and leave after receiving the 'gparticipants' command
   * @param status - [0 = leave, 1 = join], whether the event is a join or a leave event
   * @param connection_id - the user's unique connection id
   * @param session_id - the user's unique session id
   * @param user_registered - [name, 'None'] name of the message sender (if registered)
   * @param user_temporary - [name, 'None'] name of the message sender (if using a temporary name)
   * @param no_idea - don't know, always empty string
   * @param joined_at - server time of the user joining
   * @fires join
   * @fires leave
   */
  __command__participant(status: string, connection_id: string, session_id: string, user_registered: string, user_temporary: string, no_idea: string, joined_at: string): void {
    // get the name
    let name: string;
    // user is anonymous
    if (user_registered === 'None' && user_temporary === 'None') {
      // anonymous username is determined based on their joined_at unix timestamp and session_id
      name = User.parseAnonName(`<n${session_id.slice(4, 8)}/>`, joined_at.slice(0, joined_at.indexOf('.')));
    }
    // user is temporary
    else if (user_temporary !== 'None') {
      name = user_temporary;
    }
    // user is registered
    else {
      name = user_registered;
    }
    let user = this.users[name.toLowerCase()];
    // join
    if (status === '1') {
      if (user === undefined) {
        user = new User(name);
        this.users[user.name] = user;
      }
      user._connection_ids.add(connection_id);
      user.joined_at = parseFloat(joined_at);
      if (user._connection_ids.size === 1) {
        log(`User ${user} joined room ${this.identifier}`);
        this.emit('join', user);
      }
    }
    // leave
    else {
      user._connection_ids.delete(connection_id);
      if (user._connection_ids.size === 0) {
        delete this.users[user.name];
        log(`User ${user} left room ${this.identifier}`);
        this.emit('leave', user);
      }
    }
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
   * 'show_nlp' command
   * received when we send a message that was rejected due to spam detection (messages too similar to previous ones)
   * @fires spam_ban_warning
   */
  __command__show_nlp(): void {
    warn(`Could not send the following message to ${this.identifier} due to spam detection: "${this._last_message}"`);
    this.emit('spam_ban_warning');
  }

  /**
   * 'nlptb' command
   * received when we get spam banned
   * @fires spam_ban
   */
  __command__nlptb(): void {
    error(`Spam banned in ${this.identifier}`);
    this.emit('spam_ban');
  }

  /**
   * 'show_fw' command
   * received when we send messages too quickly and are about to be flood banned
   * @fires flood_ban_warning
   */
  __command__show_fw(): void {
    warn(`Flood ban warning in ${this.identifier}`);
    this.emit("flood_ban_warning")
  }

  /**
   * 'show_tb' command
   * received when we get flood banned
   * @param seconds - time of flood ban in seconds
   * @fires flood_ban
   */
  __command__show_tb(seconds: string): void {
    error(`Flood banned in ${this.identifier}`);
    this.emit('flood_ban');
  }

  /**
   * 'tb' command
   * received when we try to send a message while flood banned
   * @param second_remaining - number of seconds left on our flood ban
   * @fires flood_ban_timeout
   */
  __command__tb(seconds_remaining: string): void {
    error(`Could not send the following message to ${this.identifier} due to a flood ban. ${seconds_remaining}s remaining: "${this._last_message}"`);
    this.emit('flood_ban_timeout', parseInt(seconds_remaining, 10));
  }

  /**
   * 'climited' command
   * received when we are sending requests too quickly
   * @param server_time - unix server time
   * @param ...request - the request that was ignored by the server
   */
  __command__climited(server_time: string, ...request: string[]): void {
    error(`The following command was ignored due to flood detection: "${request.join('')}"`);
  }

  /**
   * 'delete' command
   * received when a message is deleted
   * @param message_id - the ID of the deleted message
   * @fires message_delete
   */
  __command__delete(message_id: string): void {
    const message = this._history.remove(message_id);
    if (message !== undefined) {
      log(`Message deleted in ${this.identifier}: "${message}"`);
    }
    else {
      log(`Message deleted in ${this.identifier}: ${message_id}`);
    }
    this.emit('message_delete', message);
  }

  /**
   * 'deleteall' command
   * received when multiple messages are deleted
   * @param ...message_ids - array of message IDs (colon-delineated, .split() above)
   * @fires message_delete (multiple)
   */
  __command__deleteall(...message_ids: string[]): void {
    for (let id of message_ids) {
      this.__command__delete(id);
    }
  }

  /**
   * 'blocked' command
   * received when a user is banned from the chatroom
   * received only by moderators
   * @param id - the unique moderator-only ID of the banned user
   * @param ip - the IP of the banned user
   * @param name - the username of the banned user (if registered, empty otherwise)
   * @param session_id - the session id of the banned user (or the name of their last-seen registered account (probably))
   * @param server_time - unix server time at the time of banning
   * @fires ban
   */
  __command__blocked(id: string, ip: string, name: string, session_id: string, server_time: string): void {
    log(`User "${name}" using IP "${ip}" banned from ${this.name}`);
    this.emit('ban', {id, ip, name, session_id, server_time});
  }

  /**
   * 'unblocked' command
   * received when a user is unbanned from the chatroom
   * received only by moderators
   * @param id - the unique moderator-only ID of the banned user
   * @param ip - the IP of the banned user
   * @param name - the username of the banned user (if registered, empty otherwise)
   * @param session_id - the session id of the banned user (or the name of their last-seen registered account (probably))
   * @param server_time - unix server time at the time of banning
   * @fires ban
   */
  __command__unblocked(id: string, ip: string, name: string, session_id: string, server_time: string): void {
    log(`User "${name}" using IP "${ip}" unbanned from ${this.name}`);
    this.emit('unban', {id, ip, name, session_id, server_time})
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
    const raw = raw_message.join(':');
    let name: string;
    if (user_registered) {
      name = user_registered;
    }
    else if (user_temporary) {
      name = user_temporary;
    }
    else {
      name = User.parseAnonName(raw, user_session_id);
    }
    let user = this.users[name.toLowerCase()];
    if (user === undefined) {
      user = new User(name);
      this.users[user.name] = user;
    }
    user.id = user_id;
    user.ip = user_ip;
    const message = Message.parse(raw);
    message.id = message_id;
    message.room = this;
    message.user = user;
    message.created_at = parseFloat(created_at);
    return message;
  }

  /**
   * End of public methods
   */

}

export default Room;
