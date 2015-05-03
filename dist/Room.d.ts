/// <reference path="../typings/lodash.d.ts" />
import events = require('events');
import User = require('./User');
import Connection = require('./Connection');
declare class Room extends events.EventEmitter {
    name: string;
    user: User;
    users: User[];
    connection: Connection;
    buffer: string;
    firstSend: boolean;
    has_init: boolean;
    constructor(name: string, user: User);
    join(): Room;
    send(command: string): Room;
    send(command: string[]): Room;
    private authenticate();
    private commands;
    private receiveData(data);
    private getServer(room_name);
}
export = Room;
