var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var events = require('events');
var Connection = (function (_super) {
    __extends(Connection, _super);
    function Connection() {
        _super.call(this);
    }
    return Connection;
})(events.EventEmitter);
exports.Connection = Connection;
