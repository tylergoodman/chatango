/// <reference path="../typings/tsd.d.ts" />
import request = require('request');
import Promise = require('bluebird');
import Message = require('./Message');
declare class User {
    username: string;
    password: string;
    type: User.Type;
    style: Message.Style;
    request: typeof request;
    static endpoint: string;
    endpoint_url: string;
    constructor(username?: string, password?: string);
    init(): Promise<any>;
    authenticate(): Promise<any>;
    getStyle(): Promise<Message.Style>;
    getBackground(): Promise<Message.Background>;
    getBackgroundImage(): request.Request;
    static getBackgroundImage(username: string): request.Request;
    getAvatar(): request.Request;
    static getAvatar(username: string): request.Request;
}
declare module User {
    enum Type {
        Anonymous = 0,
        Temporary = 1,
        Registered = 2,
    }
}
export = User;
