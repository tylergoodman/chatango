/// <reference path="definitions/node.d.ts" />
import events = require('events');
import net = require('net');
import User = require('./User');
declare class Connection extends events.EventEmitter {
    user: User;
    socket: net.Socket;
    constructor(user: User);
    connect(): void;
}
export = Connection;
