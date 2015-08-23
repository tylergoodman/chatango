/// <reference path="../typings/tsd.d.ts" />
import winston = require('winston');
winston.exitOnError = false;

export import Connection = require('./Connection');
export import Message = require('./Message');
export import Room = require('./Room');
export import User = require('./User');

export function joinRoom (roomname: string, username?: string, password?: string): Room {
  var ret: Room;
  if (username && password) {
    ret = new Room(roomname, new User(username, password));
  }
  else if (username) {
    ret = new Room(roomname, username);
  }
  else {
    ret = new Room(roomname, '');
  }
  ret.connect();
  return ret;
}