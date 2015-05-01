/// <reference path="definitions/node.d.ts" />
import events = require('events');
import net = require('net');
import User = require('./User');
import Room = require('./Room');
declare class Connection extends events.EventEmitter {
    user: User;
    room: Room;
    socket: net.Socket;
    connected: Boolean;
    reconnecting: Boolean;
    constructor(user: User, room: Room);
    connect(port?: number): Connection;
}
export = Connection;
