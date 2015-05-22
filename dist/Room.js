/// <reference path="../typings/node/node.d.ts" />
/// <reference path="../typings/lodash/lodash.d.ts" />
/// <reference path="../typings/bluebird/bluebird.d.ts" />
/// <reference path="../typings/winston/winston.d.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var events = require('events');
var _ = require('lodash');
var Promise = require('bluebird');
var winston = require('winston');
var User = require('./User');
var Connection = require('./Connection');
var Message = require('./Message');
var Room = (function (_super) {
    __extends(Room, _super);
    function Room(name, user) {
        var _this = this;
        if (user === void 0) { user = new User; }
        _super.call(this);
        this.owner = '';
        this.sessionid = '';
        this.id = '';
        this.moderators = [];
        this.buffer = '';
        this.firstSend = true;
        this.name = name;
        this.user = user;
        this.connection = new Connection(this._getServer());
        this.connection.on('data', this._receiveData.bind(this));
        this.connection.on('connect', function () {
            winston.log('info', "Connected to room " + _this.name);
        });
        this.connection.on('close', function () {
            winston.log('info', "Disconnected from room " + _this.name);
            _this.buffer = '';
            _this.firstSend = true;
            _this.emit('leave');
        });
    }
    Room.prototype.join = function () {
        var _this = this;
        winston.log('verbose', "Connecting to room " + this.name);
        return this.connection
            .connect()
            .then(function () {
            return new Promise(function (resolve, reject) {
                _this.once('init', resolve);
                _this.send("bauth:" + _this.name + ":" + _this.sessionid + "::");
            });
        })
            .timeout(500)
            .then(function () {
            return _this._authenticate();
        });
    };
    Room.prototype.leave = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            winston.log('verbose', "Disconnecting from room " + _this.name);
            _this.connection.disconnect();
            _this.connection.once('close', resolve);
        });
    };
    Room.prototype.send = function (command) {
        if (_.isArray(command)) {
            command = command.join(':');
        }
        if (!this.firstSend) {
            command += '\r\n';
        }
        this.firstSend = false;
        command += '\0';
        winston.log('verbose', "Sending command to room " + this.name + ": \"" + command + "\"");
        this.connection.send(command);
        return this;
    };
    Room.prototype.sendMessage = function (content) {
        return this;
    };
    Room.prototype._authenticate = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (_this.user.type === User.Type.Anonymous)
                return resolve();
            if (_this.user.type === User.Type.Temporary)
                _this.send("blogin:" + _this.user.username);
            if (_this.user.type === User.Type.Registered)
                _this.send("blogin:" + _this.user.username + ":" + _this.user.password);
            _this.once('join', resolve);
        })
            .timeout(500);
    };
    Room.prototype._handleCommand = function (command, args) {
        winston.log('debug', "Received <" + command + "> command from room " + this.name);
        switch (command) {
            case 'ok':
                var owner = args[0], sessionid = args[1], session_status = args[2], user_name = args[3], server_time = args[4], my_ip = args[5], moderators = args[6], server_id = args[7];
                this.owner = owner;
                this.sessionid = sessionid;
                this.id = server_id;
                if (moderators) {
                    var mods = moderators.split(';');
                    for (var i = 0, len = mods.length; i < len; i++) {
                        var _a = mods[i].split(','), name = _a[0], permissions = _a[1];
                        this.moderators.push(name);
                    }
                }
                break;
            case 'i':
                var created_at = args[0], user_registered = args[1], user_temporary = args[2], user_id = args[3], user_id_mod_only = args[4], message_id = args[5], user_ip = args[6], no_idea = args[7], no_idea_always_empty = args[8], raw_message = args.slice(9);
                var message = Message.parse(raw_message.join(':'));
                var name = user_registered || user_temporary;
                if (!name) {
                    name = User.getAnonName(raw_message.join(':'), user_id);
                }
                this.emit('history_message', name, message);
                break;
            case 'nomore':
                break;
            case 'inited':
                this.emit('init');
                break;
            case 'pwdok':
            case 'aliasok':
                this.emit('join');
                break;
            case 'n':
                this.here_now = parseInt(args[0], 16);
                break;
            default:
                winston.log('warn', "Received command that has no handler from room " + this.name + ": <" + command + ">");
                break;
        }
    };
    Room.prototype._receiveData = function (data) {
        this.buffer += data;
        var commands = this.buffer.split('\0');
        if (commands[commands.length - 1] !== '') {
            this.buffer = commands.pop();
        }
        else {
            commands.pop();
            this.buffer = '';
        }
        winston.log('silly', "Received commands from room " + this.name + ": " + commands);
        for (var i = 0; i < commands.length; i++) {
            var _a = commands[i].split(':'), command = _a[0], args = _a.slice(1);
            this._handleCommand(command, args);
        }
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
        throw new Error("Couldn't find host server for room name " + room_name);
    };
    return Room;
})(events.EventEmitter);
module.exports = Room;
