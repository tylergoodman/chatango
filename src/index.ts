/// <reference path="../typings/tsd.d.ts" />

export import Connection = require('./Connection');
export import Message = require('./Message');
export import Room = require('./Room');
export import User = require('./User');

export function joinRoom (room: string, username?: string, password?: string): Room {
  var ret: Room;
  if (username && password) {
    ret = new Room(room, new User(username, password));
  }
  else if (username) {
    ret = new Room(room, username);
  }
  else {
    ret = new Room(room, '');
  }
  ret.connect();
  return ret;
}