var winston = require('winston');
winston.exitOnError = false;
exports.Connection = require('./Connection');
exports.Message = require('./Message');
exports.Room = require('./Room');
exports.User = require('./User');
function joinRoom(roomname, username, password) {
    var ret;
    if (username && password) {
        ret = new exports.Room(roomname, new exports.User(username, password));
    }
    else if (username) {
        ret = new exports.Room(roomname, username);
    }
    else {
        ret = new exports.Room(roomname, '');
    }
    ret.connect();
    return ret;
}
exports.joinRoom = joinRoom;
