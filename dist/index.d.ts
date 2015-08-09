/// <reference path="../typings/tsd.d.ts" />
export import Connection = require('./Connection');
export import Message = require('./Message');
export import Room = require('./Room');
export import User = require('./User');
export declare function joinRoom(roomname: string, username?: string, password?: string): Room;
