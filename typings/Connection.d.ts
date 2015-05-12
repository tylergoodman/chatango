/// <reference path="../typings/node/node.d.ts" />
/// <reference path="../typings/winston/winston.d.ts" />
/// <reference path="../typings/bluebird/bluebird.d.ts" />
import events = require('events');
import net = require('net');
import Promise = require('bluebird');
declare class Connection extends events.EventEmitter {
    socket: net.Socket;
    connected: boolean;
    auto_reconnect: boolean;
    host: string;
    port: number;
    address: string;
    constructor(host: string, port?: number);
    connect(port?: number): Promise<void>;
    disconnect(hard?: Boolean): Connection;
    send(data: string): Promise<void>;
}
export = Connection;
