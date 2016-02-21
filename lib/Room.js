"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var net_1 = require('net');
var events_1 = require('events');
var lodash_1 = require('lodash');
var Promise = require('bluebird');
var Debug = require('debug');
var log = Debug('chatango:Room:log');
var warn = Debug('chatango:Room:warn');
var error = Debug('chatango:Room:error');
var debug = Debug('chatango:Room:debug');
var User_1 = require('./User');
var Message_1 = require('./Message');
;
var Room = (function (_super) {
    __extends(Room, _super);
    function Room(name, user, options) {
        if (user === void 0) { user = new User_1.default(); }
        _super.call(this);
        this.moderators = new Set();
        this.users = {};
        this._buffer = '';
        this._first_send = true;
        this._disconnecting = false;
        this._connecting = false;
        this.name = name;
        this.user = user;
        this.hostname = Room.getHostname(this.name);
        lodash_1.assign(this, Room.DEFAULT_OPTIONS, options);
        this._history = new Message_1.MessageCache({
            size: this.message_cache_size,
        });
        this._initSocket();
    }
    Object.defineProperty(Room.prototype, "identifier", {
        get: function () {
            return this.user + "@" + this.name;
        },
        enumerable: true,
        configurable: true
    });
    Room.getHostname = function (room_name) {
        var tsweights = [
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
        var fnv = parseInt(room_name.slice(0, Math.min(room_name.length, 5)), 36);
        var lnv = room_name.slice(6, 6 + Math.min(room_name.length - 5, 3));
        if (lnv) {
            lnv = parseInt(lnv, 36);
            if (lnv < 1000) {
                lnv = 1000;
            }
        }
        else {
            lnv = 1000;
        }
        var num = (fnv % lnv) / lnv;
        var maxnum = lodash_1.sum(tsweights.map(function (n) { return n[1]; }));
        var cumfreq = 0;
        for (var i = 0; i < tsweights.length; i++) {
            var weight = tsweights[i];
            cumfreq += weight[1] / maxnum;
            if (num <= cumfreq) {
                return "s" + weight[0] + ".chatango.com";
            }
        }
        var err_message = "Couldn't find host server for room " + room_name;
        error(err_message);
        throw new Error(err_message);
    };
    Room.prototype._initSocket = function () {
        var _this = this;
        var socket = new net_1.Socket;
        socket.setEncoding('utf8');
        socket.on('close', function (had_error) { return _this._handleClose(had_error); });
        socket.on('connect', function () { return _this._handleConnect(); });
        socket.on('data', function (data) { return _this._handleData(data); });
        socket.on('drain', function () { return _this._handleDrain(); });
        socket.on('end', function () { return _this._handleEnd(); });
        socket.on('error', function (err) { return _this._handleError(err); });
        socket.on('lookup', function (err, address, family) { return _this._handleLookup(err, address, family); });
        this._socket = socket;
    };
    Room.prototype._handleClose = function (had_error) {
        this.emit('_close', had_error);
        this._reconnect();
    };
    Room.prototype._handleData = function (data) {
        this._buffer += data;
        debug("Received data from " + this.identifier, new Buffer(this._buffer));
        var commands = this._buffer.split('\0');
        if (commands[commands.length - 1] !== '') {
            this._buffer = commands.pop();
        }
        else {
            commands.pop();
            this._buffer = '';
        }
        for (var i = 0, len = commands.length; i < len; i++) {
            var _a = commands[i].split(':'), command = _a[0], args = _a.slice(1);
            if (command === '') {
                continue;
            }
            debug("Received command from " + this.identifier + ": " + command + ": " + args.join(':'));
            var handler = this[("" + Room.COMMAND_PREFIX + command)];
            if (handler === undefined) {
                warn("Received command that has no handler from " + this.identifier + ": <" + command + ">: " + args);
            }
            else {
                handler.apply(this, args);
            }
        }
    };
    Room.prototype._handleDrain = function () {
        debug("Socket drained " + this.name + "@" + this.hostname);
    };
    Room.prototype._handleConnect = function () {
        this.emit('_connect');
    };
    Room.prototype._handleEnd = function () {
        log("Received FIN packet from " + this.name + "@" + this.hostname);
    };
    Room.prototype._handleError = function (err) {
        error("Error on connection to " + this.name + "@" + this.hostname + ": " + err);
    };
    Room.prototype._handleLookup = function (err, address, family) {
        if (err) {
            error("Error looking up " + this.name + "@" + this.hostname + ": " + err);
        }
        else {
            debug("Socket lookup " + this.name + "@" + this.hostname, address, family);
        }
    };
    Room.prototype._startPing = function () {
        var _this = this;
        debug("starting ping " + this.identifier);
        this._ping = setInterval(function () { return _this._send('', false); }, Room.PING_TIMEOUT);
    };
    Room.prototype._stopPing = function () {
        debug("stopping ping " + this.identifier);
        clearInterval(this._ping);
        this._ping = undefined;
    };
    Room.prototype._resetPing = function () {
        this._stopPing();
        this._startPing();
    };
    Room.prototype._reconnect = function () {
        var _this = this;
        if (this.auto_reconnect && !this._connecting && !this._disconnecting) {
            log("Reconnecting to " + this.name + "@" + this.hostname + " in " + Room.RECONNECT_DELAY + "ms");
            setTimeout(function () {
                log("Reconnecting to " + _this.name + "@" + _this.hostname + "...");
                _this._reset();
                _this.connect();
            }, Room.RECONNECT_DELAY);
        }
    };
    Room.prototype._reset = function () {
        this.users = {};
        this.moderators = new Set();
        this._stopPing();
        this._buffer = '';
        this._first_send = true;
        this._disconnecting = false;
        this._connecting = false;
    };
    Room.prototype._send = function (request, restartPing) {
        if (restartPing === void 0) { restartPing = true; }
        if (Array.isArray(request)) {
            request = request
                .map(function (arg) { return arg === undefined ? '' : arg; })
                .join(':');
        }
        debug("Sending request to " + this.identifier + ": \"" + request + "\"");
        if (!this._first_send) {
            request += '\r\n';
        }
        this._first_send = false;
        request += '\0';
        if (restartPing) {
            this._resetPing();
        }
        this._socket.write(request);
    };
    Room.prototype._userlist_get = function () {
        var _this = this;
        debug("Getting userlist for " + this.identifier);
        this.users[this.user.name] = this.user;
        return new Promise(function (resolve, reject) {
            _this.once('_userlist', resolve);
            _this._send('gparticipants');
        })
            .timeout(Room.TIMEOUT, "timed out while waiting for userlist command from " + this.identifier)
            .then(function () {
            debug("Got userlist for " + _this.identifier);
        });
    };
    Room.prototype._auth = function () {
        var _this = this;
        log("Authenticating " + this.identifier);
        if (this.user.type === User_1.default.Types.Anon) {
            return Promise.resolve();
        }
        return new Promise(function (resolve, reject) {
            _this.once('_auth', resolve);
            if (_this.user.type === User_1.default.Types.Temp) {
                _this._send("blogin:" + _this.user.name);
            }
            else {
                _this._send("blogin:" + _this.user.name + ":" + _this.user.password);
            }
        })
            .timeout(Room.TIMEOUT, "timed out while waiting for auth command from " + this.identifier)
            .then(function () {
            log("Authenticated " + _this.identifier);
        });
    };
    Room.prototype._join = function () {
        var _this = this;
        log("Joining " + (this.user || 'anonymous') + "@" + this.name);
        return new Promise(function (resolve, reject) {
            _this.once('_init', resolve);
            _this._send(['bauth', _this.name, _this.session_id, '', '']);
        })
            .timeout(Room.TIMEOUT, "timed out while waiting for init command from " + this.identifier)
            .then(function () {
            return _this._auth();
        })
            .then(function () {
            return _this._userlist_get();
        })
            .then(function () {
            return _this.user._getData();
        })
            .then(function () {
            if (_this.user.style.stylesOn) {
                _this._send('msgbg:1');
            }
        })
            .then(function () {
            log("Joined " + _this.identifier);
        });
    };
    Room.prototype.connect = function (port, connectListener) {
        var _this = this;
        if (port === void 0) { port = Room.PORT; }
        log("Connecting to " + this.name + "@" + this.hostname);
        this._connecting = true;
        return new Promise(function (resolve, reject) {
            _this.once('_connect', resolve);
            _this._socket.connect(port, _this.hostname, connectListener);
        })
            .timeout(Room.TIMEOUT, "Timed out while connecting to " + this.name + "@" + this.hostname)
            .then(function () {
            log("Connected to " + _this.name + "@" + _this.hostname);
            return _this._join();
        })
            .then(function () {
            _this._connecting = false;
            _this._startPing();
            _this.emit('connect', _this);
            return _this;
        })
            .catch(function (err) {
            error(err);
            _this.removeAllListeners('_connect');
            return _this.connect();
        });
    };
    Room.prototype.disconnect = function () {
        var _this = this;
        log("Disconnecting from " + this.identifier);
        this._disconnecting = true;
        return new Promise(function (resolve, reject) {
            _this.once('_close', resolve);
            _this._socket.end();
        })
            .timeout(Room.TIMEOUT, "Timed out while disconnecting from " + this.identifier)
            .catch(function (err) {
            error(err);
            _this.removeAllListeners('_close');
            return new Promise(function (resolve, reject) {
                _this.once('_close', resolve);
                _this._socket.destroy();
            });
        })
            .then(function (had_error) {
            if (had_error) {
                error("Disconnected from " + _this.identifier);
            }
            else {
                log("Disconnected from " + _this.identifier);
            }
            _this._disconnecting = false;
            _this.emit('disconnect', _this);
            return _this;
        });
    };
    Room.prototype.message = function (content) {
        this._last_message = content;
        content = lodash_1.escape(content);
        content = content.replace(/\n/g, '<br/>');
        var message;
        if (this.user.type === User_1.default.Types.Regi) {
            var _a = this.user.style, nameColor = _a.nameColor, fontSize = _a.fontSize, textColor = _a.textColor, fontFamily = _a.fontFamily;
            if (this.user.style.bold)
                content = "<b>" + content + "</b>";
            if (this.user.style.italics)
                content = "<i>" + content + "</i>";
            if (this.user.style.underline)
                content = "<u>" + content + "</u>";
            message = "<n" + nameColor + "/><f x" + fontSize + textColor + "=\"" + fontFamily + "\">" + content;
        }
        else if (this.user.type === User_1.default.Types.Temp) {
            message = "" + content;
        }
        else {
            message = "<n" + String(this.server_time | 0).slice(-4) + "/>" + content;
        }
        this._send(['bm', Math.round(15e5 * Math.random()).toString(36), '0', message]);
        return this;
    };
    Room.prototype.delete = function (message) {
        this._send(['delmsg', message.id]);
        return this;
    };
    Room.prototype.deleteAll = function (user) {
        var id, ip, name;
        if (user instanceof User_1.default) {
            (id = user.id, ip = user.ip, name = user.name, user);
        }
        else {
            (_a = user.user, id = _a.id, ip = _a.ip, name = _a.name, _a);
        }
        this._send(['delallmsg', id, ip, name]);
        return this;
        var _a;
    };
    Room.prototype.ban = function (user) {
        var id, ip, name;
        if (user instanceof User_1.default) {
            (id = user.id, ip = user.ip, name = user.name, user);
        }
        else {
            (_a = user.user, id = _a.id, ip = _a.ip, name = _a.name, _a);
        }
        this._send(['block', id, ip, name]);
        return this;
        var _a;
    };
    Room.prototype.unban = function (user) {
        var id, ip, name;
        if (user instanceof User_1.default) {
            (id = user.id, ip = user.ip, user);
        }
        else {
            (_a = user.user, id = _a.id, ip = _a.ip, _a);
        }
        this._send(['removeblock', id, ip]);
        return this;
        var _a;
    };
    Room.prototype.__command__ok = function (owner, session_id, session_status, username, server_time, ip, moderators, server_id) {
        this.owner = owner;
        this.session_id = session_id;
        this.ip = ip;
        this.id = server_id;
        this.server_time = parseFloat(server_time);
        if (moderators) {
            var mods = moderators.split(';');
            for (var i = 0, len = mods.length; i < len; i++) {
                var _a = mods[i].split(','), name_1 = _a[0], permissions = _a[1];
                this.moderators.add(name_1);
            }
        }
        if (this.user.type === User_1.default.Types.Anon) {
            this.user.name = User_1.default.parseAnonName("<n" + session_id.slice(4, 8) + "/>", (this.server_time | 0).toString());
        }
    };
    Room.prototype.__command__i = function () {
    };
    Room.prototype.__command__nomore = function () {
    };
    Room.prototype.__command__inited = function () {
        this.emit('_init');
    };
    Room.prototype.__command__pwdok = function () {
        debug("Successfully authenticated to room \"" + this.name + "\" as registered user \"" + this.user + "\"");
        this.emit('_auth');
    };
    Room.prototype.__command__aliasok = function () {
        debug("Successfully authenticated to room \"" + this.name + "\" as temporary user \"" + this.user + "\"");
        this.emit('_auth');
    };
    Room.prototype.__command__relogin = function () {
    };
    Room.prototype.__command__denied = function () {
    };
    Room.prototype.__command__badlogin = function () {
        throw new Error("Failed to join " + this.identifier + " with password \"" + this.user.password + "\": invalid credentials");
    };
    Room.prototype.__command__n = function (num_users) {
        this.here_now = parseInt(num_users, 16);
    };
    Room.prototype.__command__b = function () {
        var message = this._history.submit(this._parseMessage.apply(this, arguments));
        if (message) {
            log("Received message for room " + this.identifier + " => " + message.toString());
            this.emit('message', message);
            message.user.emit('message', message);
        }
    };
    Room.prototype.__command__u = function (old_id, new_id) {
        var message = this._history.publish(old_id, new_id);
        if (message) {
            log("Received message for room " + this.identifier + " => " + message.toString());
            this.emit('message', message);
            message.user.emit('message', message);
        }
    };
    Room.prototype.__command__mods = function (modlist) {
        this.moderators.clear();
        var mods = modlist.split(';');
        for (var i = 0, len = mods.length; i < len; i++) {
            var _a = mods[i].split(','), name_2 = _a[0], permissions = _a[1];
            this.moderators.add(name_2);
        }
        debug("Received moderator information for " + this.identifier);
        this.emit('mod_update');
    };
    Room.prototype.__command__gparticipants = function (num_unregistered) {
        var users = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            users[_i - 1] = arguments[_i];
        }
        users = users.join(':').split(';');
        for (var _a = 0, users_1 = users; _a < users_1.length; _a++) {
            var user_str = users_1[_a];
            if (user_str === '') {
                break;
            }
            var _b = user_str.split(':'), connection_id = _b[0], joined_at = _b[1], session_id = _b[2], name_3 = _b[3], None = _b[4], empty = _b[5];
            var user = this.users[name_3.toLowerCase()];
            if (user === undefined) {
                user = new User_1.default(name_3);
                this.users[user.name] = user;
                user._getData();
                debug("First time seeing registered user \"" + user + "\"@" + this.name);
            }
            user._connection_ids.add(connection_id);
            user.joined_at = parseFloat(joined_at);
        }
        debug("Received registered user information for " + this.identifier);
        this.emit('_userlist');
    };
    Room.prototype.__command__participant = function (status, connection_id, session_id, user_registered, user_temporary, no_idea, joined_at) {
        var name;
        if (user_registered === 'None' && user_temporary === 'None') {
            name = User_1.default.parseAnonName("<n" + session_id.slice(4, 8) + "/>", joined_at.slice(0, joined_at.indexOf('.')));
        }
        else if (user_temporary !== 'None') {
            name = user_temporary;
        }
        else {
            name = user_registered;
        }
        var user = this.users[name.toLowerCase()];
        if (status === '1') {
            if (user === undefined) {
                user = new User_1.default(name);
                this.users[user.name] = user;
                user._getData();
            }
            user._connection_ids.add(connection_id);
            user.joined_at = parseFloat(joined_at);
            if (user._connection_ids.size === 1) {
                log("User " + user + " joined room " + this.identifier);
                this.emit('join', user);
            }
        }
        else {
            user._connection_ids.delete(connection_id);
            if (user._connection_ids.size === 0) {
                delete this.users[user.name];
                log("User " + user + " left room " + this.identifier);
                this.emit('leave', user);
            }
        }
    };
    Room.prototype.__command__badalias = function () {
        this.emit('error', new Error("Username \"" + this.user.toString() + "\" is invalid or already in use"));
    };
    Room.prototype.__command__show_nlp = function () {
        warn("Could not send the following message to " + this.identifier + " due to spam detection: \"" + this._last_message + "\"");
        this.emit('spam_ban_warning');
    };
    Room.prototype.__command__nlptb = function () {
        error("Spam banned in " + this.identifier);
        this.emit('spam_ban');
    };
    Room.prototype.__command__show_fw = function () {
        warn("Flood ban warning in " + this.identifier);
        this.emit("flood_ban_warning");
    };
    Room.prototype.__command__show_tb = function (seconds) {
        error("Flood banned in " + this.identifier);
        this.emit('flood_ban');
    };
    Room.prototype.__command__tb = function (seconds_remaining) {
        error("Could not send the following message to " + this.identifier + " due to a flood ban. " + seconds_remaining + "s remaining: \"" + this._last_message + "\"");
        this.emit('flood_ban_timeout', parseInt(seconds_remaining, 10));
    };
    Room.prototype.__command__climited = function (server_time) {
        var request = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            request[_i - 1] = arguments[_i];
        }
        error("The following command was ignored due to flood detection: \"" + request.join('') + "\"");
    };
    Room.prototype.__command__delete = function (message_id) {
        var message = this._history.remove(message_id);
        if (message !== undefined) {
            log("Message deleted in " + this.identifier + ": \"" + message + "\"");
        }
        else {
            log("Message deleted in " + this.identifier + ": " + message_id);
        }
        this.emit('message_delete', message);
    };
    Room.prototype.__command__deleteall = function () {
        var message_ids = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            message_ids[_i - 0] = arguments[_i];
        }
        for (var _a = 0, message_ids_1 = message_ids; _a < message_ids_1.length; _a++) {
            var id = message_ids_1[_a];
            this.__command__delete(id);
        }
    };
    Room.prototype.__command__blocked = function (id, ip, name, session_id, server_time) {
        log("User \"" + name + "\" using IP \"" + ip + "\" banned from " + this.name);
        this.emit('ban', { id: id, ip: ip, name: name, session_id: session_id, server_time: server_time });
    };
    Room.prototype.__command__unblocked = function (id, ip, name, session_id, server_time) {
        log("User \"" + name + "\" using IP \"" + ip + "\" unbanned from " + this.name);
        this.emit('unban', { id: id, ip: ip, name: name, session_id: session_id, server_time: server_time });
    };
    Room.prototype._parseMessage = function (created_at, user_registered, user_temporary, user_session_id, user_id, message_id, user_ip, no_idea, no_idea2) {
        var raw_message = [];
        for (var _i = 9; _i < arguments.length; _i++) {
            raw_message[_i - 9] = arguments[_i];
        }
        var raw = raw_message.join(':');
        var name;
        if (user_registered) {
            name = user_registered;
        }
        else if (user_temporary) {
            name = user_temporary;
        }
        else {
            name = User_1.default.parseAnonName(raw, user_session_id);
        }
        var user = this.users[name.toLowerCase()];
        if (user === undefined) {
            user = new User_1.default(name);
            this.users[user.name] = user;
            user._getData();
        }
        user.id = user_id;
        user.ip = user_ip;
        var message = Message_1.default.parse(raw);
        message.id = message_id;
        message.room = this;
        message.user = user;
        message.created_at = parseFloat(created_at);
        return message;
    };
    Room.TIMEOUT = 5000;
    Room.RECONNECT_DELAY = 10000;
    Room.PING_TIMEOUT = 20000;
    Room.PORT = 443;
    Room.COMMAND_PREFIX = '__command__';
    Room.DEFAULT_OPTIONS = {
        auto_reconnect: true,
        message_cache_size: 100,
    };
    return Room;
}(events_1.EventEmitter));
exports.Room = Room;
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Room;
