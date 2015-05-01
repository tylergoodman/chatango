var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var events = require('events');
var net = require('net');
var Connection = (function (_super) {
    __extends(Connection, _super);
    function Connection(user, room) {
        _super.call(this);
        this.connected = false;
        this.reconnecting = false;
        this.user = user;
        this.room = room;
        this.socket = new net.Socket({
            readable: true,
            writeable: true,
        });
    }
    Connection.prototype.connect = function (port) {
        if (port === void 0) { port = 443; }
        return this;
    };
    return Connection;
})(events.EventEmitter);
module.exports = Connection;
