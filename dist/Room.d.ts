/// <reference path="../typings/tsd.d.ts" />
import events = require('events');
import Promise = require('bluebird');
import User = require('./User');
declare class Room extends events.EventEmitter {
    name: string;
    user: User;
    private _connection;
    owner: string;
    sessionid: string;
    id: string;
    moderators: string[];
    here_now: number;
    server_time: number;
    private _buffer;
    private _firstSend;
    private static TIMEOUT;
    constructor(name: string, user?: User);
    join(): Promise<Room>;
    leave(): Promise<void>;
    private _reset();
    changeUser(new_user: User): Promise<Room>;
    private _send(command);
    private _send(command);
    message(content: string): Room;
    private _authenticate();
    private _handleCommand(command, args);
    private _receiveData(data);
    private _getServer(room_name?);
}
export = Room;
