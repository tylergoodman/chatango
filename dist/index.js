/// <reference path="../typings/tsd.d.ts" />
exports.Connection = require('./Connection');
exports.Message = require('./Message');
exports.Room = require('./Room');
exports.User = require('./User');
function joinRoom(room, username, password) {
    var ret = new exports.Room(room, new exports.User(username, password));
    new exports.Room(room, new exports.User('ttttestuser', 'asdf1234'));
    ret.join();
    return ret;
}
exports.joinRoom = joinRoom;
