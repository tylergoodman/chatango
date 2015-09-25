/// <reference path="../typings/tsd.d.ts" />
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
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
        this.host = host;
        this.port = port;
        this.socket = new net.Socket({
            readable: true,
            writeable: true,
        });
        this.socket.setEncoding('utf8');
        this.socket.on('connect', function () {
            _this.connected = true;
            winston.log('info', "Connected to " + _this.address);
            _this.emit('connect');
        });
        this.socket.on('data', function (data) {
            winston.log('silly', "Received data: \"" + data + "\"");
            _this.emit('data', data);
        });
        this.socket.on('end', function () {
            winston.log('debug', "Received FIN packet from " + _this.address);
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
            _this.disconnect();
        });
        this.socket.on('close', function (had_error) {
            _this.connected = false;
            winston.log('info', "Connection to " + _this.address + " closed");
            _this.emit('close', had_error);
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
        this.port = port;
        winston.log('verbose', "Connecting to " + this.address);
        return new Promise(function (resolve, reject) {
            _this.once('connect', resolve);
            _this.socket.once('error', reject);
            _this.socket.connect(_this.port, _this.host);
        })
            .timeout(Connection.TIMEOUT, "timed out while connecting to server " + this.address)
            .catch(function (err) {
            winston.log('error', "Error while connecting to " + _this.address + ": " + err);
            throw err;
        });
    };
    Connection.prototype.disconnect = function () {
        var _this = this;
        winston.log('verbose', "Ending connection to " + this.address);
        return new Promise(function (resolve, reject) {
            _this.socket.end();
            _this.once('close', resolve);
        })
            .timeout(Connection.TIMEOUT, "timed out while waiting for connection to server " + this.address + " to close")
            .catch(Promise.TimeoutError, function () {
            return new Promise(function (resolve, reject) {
                winston.log('warn', "Error while disconnecting from " + _this.address + ", forcing");
                _this.socket.destroy();
                _this.once('close', resolve);
            });
        });
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
        })
            .timeout(Connection.TIMEOUT, "timed out while trying to send data to server " + this.address);
    };
    Connection.TIMEOUT = 3000;
    return Connection;
})(events.EventEmitter);
module.exports = Connection;
