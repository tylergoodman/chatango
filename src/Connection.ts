/// <reference path="definitions/node.d.ts" />

import events = require('events');
import net = require('net');

import User = require('./User');
import Room = require('./Room');

class Connection extends events.EventEmitter {
  user: User;
  room: Room;
  
  socket: net.Socket;
  connected: Boolean = false;
  reconnecting: Boolean = false;

  constructor(user: User, room: Room) {
    super();
    this.user = user;
    this.room = room;

    this.socket = new net.Socket({
      readable: true,
      writeable: true,
    });
    
  }
  connect(port:number = 443): Connection {
    
    return this;
  }
}

export = Connection;