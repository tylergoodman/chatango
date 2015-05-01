/// <reference path="definitions/node.d.ts" />

import events = require('events');
import net = require('net');

import User = require('./User');

class Connection extends events.EventEmitter {
  user: User;
  socket: net.Socket;
  constructor(user: User) {
    super();
    this.user = user;
    this.socket = new net.Socket({
      readable: true,
      writeable: true,
    });
  }
  connect() {
    
  }
}

export = Connection;