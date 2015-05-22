/// <reference path="../typings/node/node.d.ts" />
/// <reference path="../typings/lodash/lodash.d.ts" />
/// <reference path="../typings/bluebird/bluebird.d.ts" />
/// <reference path="../typings/winston/winston.d.ts" />
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
    private _buffer;
    private _firstSend;
    constructor(name: string, user?: User);
    join(): Promise<void>;
    leave(): Promise<boolean>;
    send(command: string): Room;
    send(command: string[]): Room;
    sendMessage(content: string): Room;
    private _authenticate();
    private _handleCommand(command, args);
    private _receiveData(data);
    private _getServer(room_name?);
}
export = Room;
