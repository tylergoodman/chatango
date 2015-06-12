/// <reference path="../typings/tsd.d.ts" />
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
    private static TIMEOUT;
    constructor(host: string, port?: number);
    connect(port?: number): Promise<void>;
    disconnect(): Promise<boolean>;
    send(data: string): Promise<void>;
}
export = Connection;
