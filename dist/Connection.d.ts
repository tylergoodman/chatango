/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/winston.d.ts" />
/// <reference path="../typings/bluebird.d.ts" />
import events = require('events');
import net = require('net');
import Promise = require('bluebird');
declare class Connection extends events.EventEmitter {
    socket: net.Socket;
    auto_reconnect: Boolean;
    host: string;
    port: number;
    address: string;
    constructor(host: string, port?: number);
    init(): void;
    connect(port?: number): Promise<{}>;
    disconnect(hard?: Boolean): Connection;
    send(data: string): Promise<{}>;
}
export = Connection;
