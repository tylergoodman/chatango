/// <reference path="../typings/tsd.d.ts" />
exports.Connection = require('./Connection');
exports.Message = require('./Message');
exports.Room = require('./Room');
exports.User = require('./User');
function joinRoom(room, username, password) {
    var ret;
    if (username && password) {
        ret = new exports.Room(room, new exports.User(username, password));
    }
    else if (username) {
        ret = new exports.Room(room, username);
    }
    else {
        ret = new exports.Room(room, '');
    }
    ret.connect();
    return ret;
}
exports.joinRoom = joinRoom;
