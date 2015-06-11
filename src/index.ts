/// <reference path="../typings/tsd.d.ts" />

export import Connection = require('./Connection');
export import Message = require('./Message');
export import Room = require('./Room');
export import User = require('./User');

export function joinRoom (room: string, username?: string, password?: string): Room {
  var ret = new Room(room, new User(username, password));
  new Room(room, new User('ttttestuser', 'asdf1234'))
  ret.join();
  return ret;
}