"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
__export(require('./Room'));
__export(require('./User'));
__export(require('./Message'));
var Room_2 = require('./Room');
var User_2 = require('./User');
function joinRoom(roomname, username, password) {
    var ret;
    if (username && password) {
        ret = new Room_2.default(roomname, User_2.default.login(username, password));
    }
    else if (username) {
        ret = new Room_2.default(roomname, new User_2.default(username));
    }
    else {
        ret = new Room_2.default(roomname);
    }
    ret.connect();
    return ret;
}
exports.joinRoom = joinRoom;
