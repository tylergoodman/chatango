/// <reference path="../typings/tsd.d.ts" />
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var events = require('events');
var _ = require('lodash');
var Promise = require('bluebird');
var winston = require('winston');
var User = require('./User');
var Connection = require('./Connection');
var Message = require('./Message');
var util = require('./util');
var Room = (function (_super) {
    __extends(Room, _super);
    function Room(name, user, options) {
        var _this = this;
        if (user === void 0) { user = ''; }
        _super.call(this);
        this.id = '';
        this.session_id = '';
        this.owner = '';
        this.ip = '';
        this.server_time = 0;
        this.here_now = 0;
        this.moderators = new util.Set();
        this.users = {};
        this._buffer = '';
        this._first_send = true;
        this._anonymous = false;
        this._bold = false;
        this._italics = false;
        this._underline = false;
        this.name = name;
        this.user = user;
        if (_.isString(this.user) && this.user === '') {
            this._anonymous = true;
        }
        this._history = new Message.Cache({
            size: options && options.cache_size || void 0,
        });
        this._connection = new Connection(this._getServer());
        this._connection.on('data', this._receiveData.bind(this));
        this._connection.on('close', this._reset.bind(this));
        this.on('error', function (err) {
            winston.log('error', err);
            _this._reset();
            throw err;
        });
    }
    Object.defineProperty(Room.prototype, "bold", {
        get: function () {
            if (this.user instanceof User) {
                return this.user.style.bold;
            }
            return this._bold;
        },
        set: function (val) {
            if (this.user instanceof User) {
                this.user.style.bold = val;
            }
            this._bold = val;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Room.prototype, "italics", {
        get: function () {
            if (this.user instanceof User) {
                return this.user.style.italics;
            }
            return this._italics;
        },
        set: function (val) {
            if (this.user instanceof User) {
                this.user.style.italics = val;
            }
            this._italics = val;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Room.prototype, "underline", {
        get: function () {
            if (this.user instanceof User) {
                return this.user.style.underline;
            }
            return this._underline;
        },
        set: function (val) {
            if (this.user instanceof User) {
                this.user.style.underline = val;
            }
            this._underline = val;
        },
        enumerable: true,
        configurable: true
    });
    Room.prototype._reset = function () {
        this._stopPing();
        this._buffer = '';
        this._first_send = true;
        return this;
    };
    Room.prototype._send = function (command) {
        if (_.isArray(command)) {
            command = command.join(':');
        }
        winston.log('debug', "Sending request to room \"" + this.name + "\": \"" + command + "\"");
        if (!this._first_send) {
            command += '\r\n';
        }
        this._first_send = false;
        command += '\0';
        this._connection.send(command);
        return this;
    };
    Room.prototype._receiveData = function (data) {
        this._buffer += data;
        var commands = this._buffer.split('\0');
        if (commands[commands.length - 1] !== '') {
            this._buffer = commands.pop();
        }
        else {
            commands.pop();
            this._buffer = '';
        }
        winston.log('silly', "Received commands from room \"" + this.name + "\": " + commands);
        for (var i = 0; i < commands.length; i++) {
            var _a = commands[i].split(':'), command = _a[0], args = _a.slice(1);
            if (command === '') {
                continue;
            }
            winston.log('debug', "Received command from room \"" + this.name + "\": " + command);
            var handler = this[("__command__" + command)];
            if (handler === void 0) {
                winston.log('warn', "Received command that has no handler from room \"" + this.name + "\": <" + command + ">: " + args);
            }
            else {
                handler.apply(this, args);
            }
        }
    };
    Room.prototype._pingTask = function () {
        this._send('');
    };
    Room.prototype._startPing = function () {
        this._ping = setInterval(this._pingTask.bind(this), 20000);
    };
    Room.prototype._stopPing = function () {
        clearInterval(this._ping);
    };
    Room.prototype._restartPing = function () {
        this._stopPing();
        this._startPing();
    };
    Room.prototype._getServer = function (room_name) {
        if (room_name === void 0) { room_name = this.name; }
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
        var fnv = parseInt(room_name.slice(0, _.min([room_name.length, 5])), 36);
        var lnv = room_name.slice(6, 6 + _.min([room_name.length - 5, 3]));
        if (lnv) {
            lnv = parseInt(lnv, 36);
            if (lnv < 1000)
                lnv = 1000;
        }
        else
            lnv = 1000;
        var num = (fnv % lnv) / lnv;
        var maxnum = _.sum(tsweights.map(function (n) { return n[1]; }));
        var cumfreq = 0;
        for (var i = 0; i < tsweights.length; i++) {
            var weight = tsweights[i];
            cumfreq += weight[1] / maxnum;
            if (num <= cumfreq) {
                return "s" + weight[0] + ".chatango.com";
            }
        }
        throw new Error("Couldn't find host server for room " + room_name);
    };
    Room.prototype.connect = function () {
        var _this = this;
        winston.log('verbose', "Joining room " + this.name);
        return this._connection
            .connect()
            .then(function () {
            return new Promise(function (resolve, reject) {
                _this.once('_init', resolve);
                _this._send("bauth:" + _this.name + ":" + _this.session_id + "::");
            })
                .timeout(Room.TIMEOUT, "timed out while waiting for init command from room \"" + _this.name + "\" as user \"" + _this.user.toString() + "\"");
        })
            .then(function () {
            if (_this._anonymous)
                return;
            return new Promise(function (resolve, reject) {
                _this.once('_auth', resolve);
                if (_.isString(_this.user))
                    return _this._send("blogin:" + _this.user);
                if (_this.user instanceof User)
                    return _this._send("blogin:" + _this.user.name + ":" + _this.user.password);
                throw new Error("Cannot join room as user \"" + _this.user + "\"");
            })
                .timeout(Room.TIMEOUT, "timed out while waiting for auth command from room \"" + _this.name + "\" as user \"" + _this.user.toString() + "\"");
        })
            .then(function () {
            if (_this.user instanceof User) {
                _this.users[_this.user.name] = _this.user;
            }
            return new Promise(function (resolve, reject) {
                _this.once('_userlist', resolve);
                _this._send('gparticipants');
            })
                .timeout(Room.TIMEOUT, "timed out while waiting for userlist from room \"" + _this.name + "\" as user \"" + _this.user.toString() + "\"");
        })
            .then(function () {
            if (_this.user instanceof User) {
                return _this.user.init();
            }
        })
            .then(function () {
            if (_this.user instanceof User && _this.user.style.stylesOn) {
                _this._send('msgbg:1');
            }
        })
            .then(function () {
            winston.log('info', "Joined room \"" + _this.name + "\" as user \"" + _this.user.toString() + "\"");
            _this._startPing();
            _this.emit('connect', _this);
            return _this;
        })
            .timeout(Room.TIMEOUT, "timed out while connecting to room \"" + this.name + "\" as user \"" + this.user.toString() + "\"")
            .catch(Promise.TimeoutError, function (err) {
            return _this.disconnect();
        });
    };
    Room.prototype.disconnect = function () {
        var _this = this;
        winston.log('verbose', "Leaving room \"" + this.name + "\" as user \"" + this.user.toString() + "\"");
        return this._connection.disconnect()
            .then(function () {
            winston.log('info', "Left room \"" + _this.name + "\" as user \"" + _this.user.toString() + "\"");
            _this._reset();
            _this.emit('disconnect');
            return _this;
        });
    };
    Room.prototype.message = function (content) {
        this._last_message = content;
        content = _.escape(content);
        if (this.bold)
            content = "<b>" + content + "</b>";
        if (this.italics)
            content = "<i>" + content + "</i>";
        if (this.underline)
            content = "<u>" + content + "</u>";
        content.replace('\n', '<br/>');
        var message;
        if (this.user instanceof User) {
            var _a = this.user.style, nameColor = _a.nameColor, fontSize = _a.fontSize, textColor = _a.textColor, fontFamily = _a.fontFamily;
            message = "<n" + nameColor + "/><f x" + fontSize + textColor + "=\"" + fontFamily + "\">" + content;
        }
        else if (_.isString(this.user) && !this._anonymous) {
            message = "" + content;
        }
        else {
            message = "<n" + String(this.server_time | 0).slice(-4) + "/>" + content;
        }
        this._send(['bm', Math.round(15e5 * Math.random()).toString(36), '0', message]);
        return this;
    };
    Room.prototype.delete = function (message) {
        var id;
        if (message instanceof Message) {
            id = message.id;
        }
        else {
            id = message;
        }
        this._send(['delmsg', id]);
        return this;
    };
    Room.prototype.deleteAll = function (user) {
        var id;
        if (user instanceof Message) {
            id = user.user_id;
        }
        else {
            id = user;
        }
        this._send(['delallmsg', id.id, id.ip, id.name]);
        return this;
    };
    Room.prototype.ban = function (user) {
        var id;
        if (user instanceof Message) {
            id = user.user_id;
        }
        else {
            id = user;
        }
        this._send(['block', id.id, id.ip, id.name]);
        return this;
    };
    Room.prototype.unban = function (user) {
        var id;
        if (user instanceof Message) {
            id = user.user_id;
        }
        else {
            id = user;
        }
        this._send(['removeblock', id.id, id.ip]);
        return this;
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
                var _a = mods[i].split(','), name = _a[0], permissions = _a[1];
                this.moderators.add(name);
            }
        }
        if (this._anonymous) {
            this.user = User.parseAnonName("<n" + session_id.slice(4, 8) + "/>", (this.server_time | 0).toString());
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
        winston.log('info', "Successfully authenticated to room \"" + this.name + "\" as registered user \"" + this.user.toString() + "\"");
        this.emit('_auth');
    };
    Room.prototype.__command__aliasok = function () {
        winston.log('info', "Successfully authenticated to room \"" + this.name + "\" as temporary user \"" + this.user.toString() + "\"");
        this.emit('_auth');
    };
    Room.prototype.__command__n = function (num_users) {
        this.here_now = parseInt(num_users, 16);
    };
    Room.prototype.__command__b = function () {
        var message = this._history.submit(this._parseMessage.apply(this, arguments));
        if (message) {
            winston.log('verbose', "Received message for room \"" + this.name + "\" as user \"" + this.user.toString() + "\":");
            winston.log('info', "" + message.toString());
            this.emit('message', message);
            if (message.user instanceof User) {
                message.user.emit('message', message);
            }
        }
    };
    Room.prototype.__command__u = function (old_id, new_id) {
        var message = this._history.publish(old_id, new_id);
        if (message) {
            winston.log('verbose', "Received message for room \"" + this.name + "\" as user \"" + this.user.toString() + "\":");
            winston.log('info', "" + message.toString());
            this.emit('message', message);
            if (message.user instanceof User) {
                message.user.emit('message', message);
            }
        }
    };
    Room.prototype.__command__mods = function (modlist) {
        this.moderators.clear();
        var mods = modlist.split(';');
        for (var i = 0, len = mods.length; i < len; i++) {
            var _a = mods[i].split(','), name = _a[0], permissions = _a[1];
            this.moderators.add(name);
        }
        winston.log('verbose', "Received moderator information for room \"" + this.name + "\"");
        this.emit('mod_update');
    };
    Room.prototype.__command__gparticipants = function (num_unregistered) {
        var users = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            users[_i - 1] = arguments[_i];
        }
        users = users.join(':').split(';');
        for (var i = 0, len = users.length; i < len; i++) {
            var user_string = users[i];
            if (user_string === '') {
                break;
            }
            var _a = user_string.split(':'), connection_id = _a[0], joined_at = _a[1], session_id = _a[2], name = _a[3], None = _a[4];
            name = name.toLowerCase();
            var user = this.users[name];
            if (user === void 0) {
                user = new User(name);
                this.users[name] = user;
                user.init();
                winston.log('debug', "First time seeing registered user \"" + name + "\"");
            }
            user._connection_ids.add(connection_id);
            user.joined_at = parseFloat(joined_at);
        }
        winston.log('verbose', "Received registered user information for room \"" + this.name + "\"");
        this.emit('_userlist');
    };
    Room.prototype.__command__participant = function (status, connection_id, session_id, user_registered, user_temporary, no_idea, joined_at) {
        var user;
        if (user_registered === 'None' && user_temporary === 'None') {
            user = User.parseAnonName("<n" + session_id.slice(4, 8) + "/>", joined_at.slice(0, joined_at.indexOf('.')));
        }
        else if (user_temporary !== 'None') {
            user = user_temporary.toLowerCase();
        }
        else {
            user_registered = user_registered.toLowerCase();
            user = this.users[user_registered];
            if (user === void 0) {
                user = new User(user_registered);
                this.users[user_registered] = user;
                winston.log('debug', "First time seeing registered user \"" + user.name + "\"");
            }
        }
        if (status === '1') {
            if (user instanceof User) {
                user._connection_ids.add(connection_id);
                if (user._connection_ids.length === 1) {
                    user.joined_at = parseFloat(joined_at);
                    user.init();
                    winston.log('info', "Registered user \"" + user.name + "\" joined room \"" + this.name + "\"");
                }
            }
            else {
                winston.log('info', "Temporary user \"" + user + "\" joined room \"" + this.name + "\"");
            }
            this.emit('join', user);
        }
        else {
            if (user instanceof User) {
                user._connection_ids.delete(connection_id);
                if (user._connection_ids.length === 0) {
                    delete this.users[user.name];
                    winston.log('info', "Registered user \"" + user.name + "\" left room \"" + this.name + "\"");
                }
            }
            else {
                winston.log('info', "Temporary user \"" + user + "\" left room \"" + this.name + "\"");
            }
            this.emit('leave', user);
        }
    };
    Room.prototype.__command__badalias = function () {
        this.emit('error', new Error("Username \"" + this.user.toString() + "\" is invalid or already in use"));
    };
    Room.prototype.__command__show_nlp = function () {
        winston.log('warn', "Could not send the following message to room \"" + this.name + "\" as user \"" + this.user.toString() + "\" due to spam detection:\n\"" + this._last_message + "\"");
        this.emit('spam_ban_warning');
    };
    Room.prototype.__command__nlptb = function () {
        winston.log('warn', "Spam banned in room \"" + this.name + "\" as user \"" + this.user.toString() + "\"");
        this.emit('spam_ban');
    };
    Room.prototype.__command__show_fw = function () {
        winston.log('warn', "Flood ban warning in room \"" + this.name + "\" as user \"" + this.user.toString() + "\"");
        this.emit("flood_ban_warning");
    };
    Room.prototype.__command__show_tb = function (seconds) {
        winston.log('warn', "Flood banned in room \"" + this.name + "\" as user \"" + this.user.toString + "\"");
        this.emit('flood_ban');
    };
    Room.prototype.__command__tb = function (seconds_remaining) {
        winston.log('warn', "Could not send the following message to room \"" + this.name + "\" as user \"" + this.user.toString() + "\" due to a flood ban. " + seconds_remaining + " seconds remaining\n\"" + this._last_message + "\"");
        this.emit('flood_ban_timeout', parseInt(seconds_remaining, 10));
    };
    Room.prototype.__command__climited = function (server_time) {
        var request = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            request[_i - 1] = arguments[_i];
        }
        winston.log('warn', "The following command was ignored due to flood detection: \"" + request.join('') + "\"");
    };
    Room.prototype.__command__delete = function (message_id) {
        var message = this._history.remove(message_id);
        if (message !== void 0) {
            winston.log('verbose', "The following message has been deleted in room \"" + this.name + ":\n" + message.toString() + "\"");
            this.emit('message_delete', message);
        }
    };
    Room.prototype.__command__deleteall = function () {
        var message_ids = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            message_ids[_i - 0] = arguments[_i];
        }
        for (var i = 0, len = message_ids.length; i < len; i++) {
            var id = message_ids[i];
            var message = this._history.remove(id);
            if (message !== void 0) {
                winston.log('verbose', "The following message has been deleted in room \"" + this.name + ":\n" + message.toString() + "\"");
                this.emit('message_delete', message);
            }
        }
    };
    Room.prototype.__command__blocked = function (id, ip, name, server_time) {
        winston.log('info', "User \"" + (name || 'anonymous') + "\" using IP \"" + ip + "\" banned from room \"" + this.name + "\"");
        this.emit('ban', { id: id, ip: ip, name: name, server_time: server_time });
    };
    Room.prototype._parseMessage = function (created_at, user_registered, user_temporary, user_session_id, user_id, message_id, user_ip, no_idea, no_idea2) {
        var raw_message = [];
        for (var _i = 9; _i < arguments.length; _i++) {
            raw_message[_i - 9] = arguments[_i];
        }
        var raw = raw_message.join(':');
        var user;
        if (user_registered) {
            user_registered = user_registered.toLowerCase();
            user = this.users[user_registered];
            if (user === void 0) {
                user = new User(user_registered);
            }
        }
        else if (user_temporary) {
            user = user_temporary;
        }
        else {
            user = User.parseAnonName(raw, user_session_id);
        }
        var message = Message.parse(raw);
        message.id = message_id;
        message.user_id = {
            name: user.toString().toLowerCase(),
            id: user_id,
            ip: user_ip,
        };
        message.room = this;
        message.user = user;
        message.created_at = parseFloat(created_at);
        return message;
    };
    Room.TIMEOUT = 3000;
    return Room;
})(events.EventEmitter);
module.exports = Room;
