/// <reference path="../typings/tsd.d.ts" />
import fs = require('fs');
import request = require('request');
import Promise = require('bluebird');
import Message = require('./Message');
import util = require('./util');
declare class User {
    name: string;
    password: string;
    joined_at: number;
    style: Message.Style;
    background: Message.Background;
    _ips: util.Set<string>;
    _ids: util.Set<string>;
    private _cookies;
    ENDPOINT: string;
    constructor(name: string, password?: string);
    toString(): string;
    init(): Promise<void>;
    authenticate(): Promise<void>;
    getStyle(): Promise<Message.Style>;
    setStyle(style?: Message.Style): Promise<Message.Style>;
    getBackground(): Promise<Message.Background>;
    setBackground(background?: Message.Background): Promise<Message.Background>;
    setBackgroundImage(stream: fs.ReadStream): Promise<void>;
    getBackgroundImage(): request.Request;
    getAvatar(): request.Request;
    static parseAnonName(message: string, _id: string): string;
    static getStyle(username: string): Promise<Message.Style>;
    static getBackground(username: string): Promise<Message.Background>;
    static getBackgroundImage(username: string): request.Request;
    static getAvatar(username: string): request.Request;
}
export = User;
