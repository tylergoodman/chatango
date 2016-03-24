"use strict";
const net_1 = require('net');
const events_1 = require('events');
const lodash_1 = require('lodash');
const Promise = require('bluebird');
const Debug = require('debug');
const log = Debug('chatango:Room:log');
const warn = Debug('chatango:Room:warn');
const error = Debug('chatango:Room:error');
const debug = Debug('chatango:Room:debug');
const User_1 = require('./User');
const Message_1 = require('./Message');
;
class Room extends events_1.EventEmitter {
    constructor(name, user, options) {
        super();
        this.moderators = new Set();
        this.users = new Map();
        this._buffer = '';
        this._first_send = true;
        this._disconnecting = false;
        this._connecting = false;
        if (user === undefined) {
            user = new User_1.default();
        }
        this.name = name;
        this.user = user;
        this.hostname = Room.getHostname(this.name);
        lodash_1.assign(this, Room.DEFAULT_OPTIONS, options);
        this._history = new Message_1.MessageCache({
            size: this.message_cache_size,
        });
        this._initSocket();
    }
    get identifier() {
        return `${this.user}@${this.name}`;
    }
    static getHostname(room_name) {
        const tsweights = [
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
        let lnv = room_name.slice(6, 6 + Math.min(room_name.length - 5, 3));
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
        const maxnum = lodash_1.sum(tsweights.map((n) => { return n[1]; }));
        let cumfreq = 0;
        for (let i = 0; i < tsweights.length; i++) {
            const weight = tsweights[i];
            cumfreq += weight[1] / maxnum;
            if (num <= cumfreq) {
                return `s${weight[0]}.chatango.com`;
            }
        }
        const err_message = `Couldn't find host server for room ${room_name}`;
        error(err_message);
        throw new Error(err_message);
    }
    _initSocket() {
        const socket = new net_1.Socket;
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
    _handleClose(had_error) {
        this.emit('_close', had_error);
        this._reconnect();
    }
    _handleData(data) {
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
        for (let i = 0, len = commands.length; i < len; i++) {
            const [command, ...args] = commands[i].split(':');
            if (command === '') {
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
    _handleDrain() {
        debug(`Socket drained ${this.name}@${this.hostname}`);
    }
    _handleConnect() {
        this.emit('_connect');
    }
    _handleEnd() {
        log(`Received FIN packet from ${this.name}@${this.hostname}`);
    }
    _handleError(err) {
        error(`Error on connection to ${this.name}@${this.hostname}: ${err}`);
    }
    _handleLookup(err, address, family) {
        if (err) {
            error(`Error looking up ${this.name}@${this.hostname}: ${err}`);
        }
        else {
            debug(`Socket lookup ${this.name}@${this.hostname}`, address, family);
        }
    }
    _startPing() {
        if (this._ping !== undefined) {
            return;
        }
        debug(`starting ping ${this.identifier}`);
        this._ping = setInterval(() => this._send('', false), Room.PING_TIMEOUT);
    }
    _stopPing() {
        debug(`stopping ping ${this.identifier}`);
        clearInterval(this._ping);
        this._ping = undefined;
    }
    _resetPing() {
        this._stopPing();
        this._startPing();
    }
    _reconnect() {
        if (this.auto_reconnect && !this._connecting && !this._disconnecting) {
            log(`Reconnecting to ${this.name}@${this.hostname} in ${Room.RECONNECT_DELAY}ms`);
            setTimeout(() => {
                log(`Reconnecting to ${this.name}@${this.hostname}...`);
                this._reset();
                this.connect();
            }, Room.RECONNECT_DELAY);
        }
    }
    _reset() {
        this.users = new Map();
        this.moderators = new Set();
        this._stopPing();
        this._buffer = '';
        this._first_send = true;
        this._disconnecting = false;
        this._connecting = false;
    }
    _send(request, restartPing = true) {
        if (Array.isArray(request)) {
            request = request
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
    _userlist_get() {
        debug(`Getting userlist for ${this.identifier}`);
        this.users.set(this.user.name, this.user);
        return new Promise((resolve, reject) => {
            this.once('_userlist', resolve);
            this._send('gparticipants');
        })
            .timeout(Room.TIMEOUT, `timed out while waiting for userlist command from ${this.identifier}`)
            .then(() => {
            debug(`Got userlist for ${this.identifier}`);
        });
    }
    _auth() {
        log(`Authenticating ${this.identifier}`);
        if (this.user.type === User_1.default.Types.Anon) {
            return Promise.resolve();
        }
        return new Promise((resolve, reject) => {
            this.once('_auth', resolve);
            if (this.user.type === User_1.default.Types.Temp) {
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
    _join() {
        log(`Joining ${this.user || 'anonymous'}@${this.name}`);
        return new Promise((resolve, reject) => {
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
    _find_user_by_id(connection_id) {
        for (const user of this.users.values()) {
            for (const id of user._connection_ids) {
                if (id === connection_id) {
                    return user;
                }
            }
        }
        return undefined;
    }
    connect(port = Room.PORT, connectListener) {
        log(`Connecting to ${this.name}@${this.hostname}`);
        this._connecting = true;
        return new Promise((resolve, reject) => {
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
    disconnect() {
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
            .then((had_error) => {
            if (had_error) {
                error(`Disconnected from ${this.identifier}`);
            }
            else {
                log(`Disconnected from ${this.identifier}`);
            }
            this._disconnecting = false;
            this.emit('disconnect', this);
            return this;
        });
    }
    message(content) {
        this._last_message = content;
        content = lodash_1.escape(content);
        content = content.replace(/\n/g, '<br/>');
        let message;
        if (this.user.type === User_1.default.Types.Regi) {
            const { nameColor, fontSize, textColor, fontFamily } = this.user.style;
            if (this.user.style.bold)
                content = `<b>${content}</b>`;
            if (this.user.style.italics)
                content = `<i>${content}</i>`;
            if (this.user.style.underline)
                content = `<u>${content}</u>`;
            message = `<n${nameColor}/><f x${fontSize}${textColor}="${fontFamily}">${content}`;
        }
        else if (this.user.type === User_1.default.Types.Temp) {
            message = `${content}`;
        }
        else {
            message = `<n${String(this.server_time | 0).slice(-4)}/>${content}`;
        }
        this._send(['bm', Math.round(15e5 * Math.random()).toString(36), '0', message]);
        return this;
    }
    delete(message) {
        this._send(['delmsg', message.id]);
        return this;
    }
    deleteAll(user) {
        let id, ip, name;
        if (user instanceof User_1.default) {
            ({ id: id, ip: ip, name: name } = user);
        }
        else {
            ({ id: id, ip: ip, name: name } = user.user);
        }
        this._send(['delallmsg', id, ip, name]);
        return this;
    }
    ban(user) {
        let id, ip, name;
        if (user instanceof User_1.default) {
            ({ id: id, ip: ip, name: name } = user);
        }
        else {
            ({ id: id, ip: ip, name: name } = user.user);
        }
        this._send(['block', id, ip, name]);
        return this;
    }
    unban(user) {
        let id, ip, name;
        if (user instanceof User_1.default) {
            ({ id: id, ip: ip } = user);
        }
        else {
            ({ id: id, ip: ip } = user.user);
        }
        this._send(['removeblock', id, ip]);
        return this;
    }
    __command__ok(owner, session_id, session_status, username, server_time, ip, moderators, server_id) {
        this.owner = owner;
        this.session_id = session_id;
        this.ip = ip;
        this.id = server_id;
        this.server_time = parseFloat(server_time);
        if (moderators) {
            const mods = moderators.split(';');
            for (let i = 0, len = mods.length; i < len; i++) {
                const [name, permissions] = mods[i].split(',');
                this.moderators.add(name);
            }
        }
        if (this.user.type === User_1.default.Types.Anon) {
            this.user.name = User_1.default.parseAnonName(`<n${session_id.slice(4, 8)}/>`, (this.server_time | 0).toString());
        }
    }
    __command__i() {
    }
    __command__nomore() {
    }
    __command__inited() {
        this.emit('_init');
    }
    __command__pwdok() {
        debug(`Successfully authenticated to room "${this.name}" as registered user "${this.user}"`);
        this.emit('_auth');
    }
    __command__aliasok() {
        debug(`Successfully authenticated to room "${this.name}" as temporary user "${this.user}"`);
        this.emit('_auth');
    }
    __command__relogin() {
    }
    __command__denied() {
    }
    __command__badlogin() {
        throw new Error(`Failed to join ${this.identifier} with password "${this.user.password}": invalid credentials`);
    }
    __command__n(num_users) {
        this.here_now = parseInt(num_users, 16);
    }
    __command__b() {
        const message = this._history.submit(this._parseMessage.apply(this, arguments));
        if (message) {
            log(`Received message for room ${this.identifier} => ${message.toString()}`);
            this.emit('message', message);
            message.user.emit('message', message);
        }
    }
    __command__u(old_id, new_id) {
        const message = this._history.publish(old_id, new_id);
        if (message) {
            log(`Received message for room ${this.identifier} => ${message.toString()}`);
            this.emit('message', message);
            message.user.emit('message', message);
        }
    }
    __command__mods(modlist) {
        this.moderators.clear();
        const mods = modlist.split(';');
        for (let i = 0, len = mods.length; i < len; i++) {
            const [name, permissions] = mods[i].split(',');
            this.moderators.add(name);
        }
        debug(`Received moderator information for ${this.identifier}`);
        this.emit('mod_update');
    }
    __command__gparticipants(num_unregistered, ...users) {
        users = users.join(':').split(';');
        for (let user_str of users) {
            if (user_str === '') {
                break;
            }
            const [connection_id, joined_at, session_id, name, None, empty] = user_str.split(':');
            let user = this.users.get(name.toLowerCase());
            if (user === undefined) {
                user = new User_1.default(name, User_1.default.Types.Regi);
                this.users.set(user.name, user);
                debug(`First time seeing registered user "${user}"@${this.name}`);
            }
            user._connection_ids.add(connection_id);
            user.joined_at = parseFloat(joined_at);
        }
        debug(`Received registered user information for ${this.identifier}`);
        this.emit('_userlist');
    }
    __command__participant(status, connection_id, session_id, user_registered, user_temporary, no_idea, joined_at) {
        function addUser() {
        }
        function removeUser() {
        }
        let name;
        let type;
        if (user_registered === 'None' && user_temporary === 'None') {
            name = User_1.default.parseAnonName(`<n${session_id.slice(4, 8)}/>`, joined_at.slice(0, joined_at.indexOf('.')));
            type = User_1.default.Types.Anon;
        }
        else if (user_temporary !== 'None') {
            name = user_temporary;
            type = User_1.default.Types.Temp;
        }
        else {
            name = user_registered;
            type = User_1.default.Types.Regi;
        }
        let user = this.users.get(name.toLowerCase());
        if (status === '2') {
            let old_user = this._find_user_by_id(connection_id);
            old_user._connection_ids.delete(connection_id);
            if (old_user._connection_ids.size === 0) {
                this.users.delete(old_user.name);
                log(`User ${old_user} left room ${this.identifier}`);
                this.emit('leave', old_user);
            }
            if (user === undefined) {
                user = new User_1.default(name, type);
                this.users.set(user.name, user);
            }
            user._connection_ids.add(connection_id);
            user.joined_at = parseFloat(joined_at);
            if (user._connection_ids.size === 1) {
                log(`User ${user} joined room ${this.identifier}`);
                this.emit('join', user);
            }
        }
        else if (status === '1') {
            if (user === undefined) {
                user = new User_1.default(name, type);
                this.users.set(user.name, user);
            }
            user._connection_ids.add(connection_id);
            user.joined_at = parseFloat(joined_at);
            if (user._connection_ids.size === 1) {
                log(`User ${user} joined room ${this.identifier}`);
                this.emit('join', user);
            }
        }
        else if (status === '0') {
            user._connection_ids.delete(connection_id);
            if (user._connection_ids.size === 0) {
                this.users.delete(user.name);
                log(`User ${user} left room ${this.identifier}`);
                this.emit('leave', user);
            }
        }
        else {
            error(`Unknown __participant__ status: ${status} --- ${Array.prototype.join.call(arguments, ':')}`);
        }
    }
    __command__badalias() {
        this.emit('error', new Error(`Username "${this.user.toString()}" is invalid or already in use`));
    }
    __command__show_nlp() {
        warn(`Could not send the following message to ${this.identifier} due to spam detection: "${this._last_message}"`);
        this.emit('spam_ban_warning');
    }
    __command__nlptb() {
        error(`Spam banned in ${this.identifier}`);
        this.emit('spam_ban');
    }
    __command__show_fw() {
        warn(`Flood ban warning in ${this.identifier}`);
        this.emit("flood_ban_warning");
    }
    __command__show_tb(seconds) {
        error(`Flood banned in ${this.identifier}`);
        this.emit('flood_ban');
    }
    __command__tb(seconds_remaining) {
        error(`Could not send the following message to ${this.identifier} due to a flood ban. ${seconds_remaining}s remaining: "${this._last_message}"`);
        this.emit('flood_ban_timeout', parseInt(seconds_remaining, 10));
    }
    __command__climited(server_time, ...request) {
        error(`The following command was ignored due to flood detection: "${request.join('')}"`);
    }
    __command__delete(message_id) {
        const message = this._history.remove(message_id);
        if (message !== undefined) {
            log(`Message deleted in ${this.identifier}: "${message}"`);
        }
        else {
            log(`Message deleted in ${this.identifier}: ${message_id}`);
        }
        this.emit('message_delete', message);
    }
    __command__deleteall(...message_ids) {
        for (let id of message_ids) {
            this.__command__delete(id);
        }
    }
    __command__blocked(id, ip, name, session_id, server_time) {
        log(`User "${name}" using IP "${ip}" banned from ${this.name}`);
        this.emit('ban', { id: id, ip: ip, name: name, session_id: session_id, server_time: server_time });
    }
    __command__unblocked(id, ip, name, session_id, server_time) {
        log(`User "${name}" using IP "${ip}" unbanned from ${this.name}`);
        this.emit('unban', { id: id, ip: ip, name: name, session_id: session_id, server_time: server_time });
    }
    _parseMessage(created_at, user_registered, user_temporary, user_session_id, user_id, message_id, user_ip, no_idea, no_idea2, ...raw_message) {
        const raw = raw_message.join(':');
        let name;
        let type;
        if (user_registered) {
            name = user_registered;
            type = User_1.default.Types.Regi;
        }
        else if (user_temporary) {
            name = user_temporary;
            type = User_1.default.Types.Temp;
        }
        else {
            name = User_1.default.parseAnonName(raw, user_session_id);
            type = User_1.default.Types.Anon;
        }
        let user = this.users.get(name.toLowerCase());
        if (user === undefined) {
            user = new User_1.default(name, type);
            this.users.set(user.name, user);
        }
        user.id = user_id;
        user.ip = user_ip;
        const message = Message_1.default.parse(raw);
        message.id = message_id;
        message.room = this;
        message.user = user;
        message.created_at = parseFloat(created_at);
        return message;
    }
}
Room.TIMEOUT = 5000;
Room.RECONNECT_DELAY = 10000;
Room.PING_TIMEOUT = 20000;
Room.PORT = 443;
Room.COMMAND_PREFIX = '__command__';
Room.DEFAULT_OPTIONS = {
    auto_reconnect: true,
    message_cache_size: 100,
};
exports.Room = Room;
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Room;
