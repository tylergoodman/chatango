/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/winston.d.ts" />
/// <reference path="../typings/bluebird.d.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var events = require('events');
var net = require('net');
var winston = require('winston');
var Promise = require('bluebird');
var Connection = (function (_super) {
    __extends(Connection, _super);
    function Connection(host, port) {
        var _this = this;
        if (port === void 0) { port = 443; }
        _super.call(this);
        this.connected = false;
        this.auto_reconnect = false;
        this.host = host;
        this.port = port;
        this.socket = new net.Socket({
            readable: true,
            writeable: true,
        });
        this.socket.setEncoding('utf8');
        this.socket.on('connect', function () {
            winston.log('verbose', "Connected to " + _this.address);
            _this.emit('connect');
        });
        this.socket.on('data', function (data) {
            winston.log('silly', "Received data: \"" + data + "\"");
            _this.emit('data', data);
        });
        this.socket.on('end', function () {
            winston.log('verbose', "Received FIN packet from " + _this.address);
            _this.emit('end');
        });
        this.socket.on('timeout', function () {
            winston.log('warn', _this.address + " timeout");
            _this.emit('timeout');
        });
        this.socket.on('drain', function () {
            _this.emit('drain');
        });
        this.socket.on('error', function (err) {
            winston.log('error', "Error on connection to " + _this.address + ": " + err);
            _this.auto_reconnect = false;
            _this.emit('error');
        });
        this.socket.on('close', function () {
            winston.log('verbose', "Connection to " + _this.address + " closed");
            _this.emit('close');
            if (_this.auto_reconnect) {
                winston.log('verbose', "Attempting to reconnect to " + _this.address);
                _this.connect();
            }
        });
    }
    Object.defineProperty(Connection.prototype, "address", {
        get: function () {
            return this.host + ":" + this.port;
        },
        enumerable: true,
        configurable: true
    });
    Connection.prototype.connect = function (port) {
        var _this = this;
        if (port === void 0) { port = this.port; }
        winston.log('verbose', "Connecting to " + this.address);
        return new Promise(function (resolve, reject) {
            _this.socket.connect(_this.port, _this.host, resolve);
        });
    };
    Connection.prototype.disconnect = function (hard) {
        if (hard === void 0) { hard = false; }
        winston.log('verbose', "Ending connection to " + this.address);
        if (hard)
            this.socket.destroy();
        else
            this.socket.end();
        return this;
    };
    Connection.prototype.send = function (data) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (!_this.connected) {
                var error = "Couldn't send data to " + _this.address + ": not connected";
                winston.log('error', error);
                return reject(new Error(error));
            }
            winston.log('silly', "Sending data to " + _this.address + ": \"" + data + "\"");
            _this.socket.write(data, resolve);
        });
    };
    return Connection;
})(events.EventEmitter);
module.exports = Connection;
