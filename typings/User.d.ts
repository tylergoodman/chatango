/// <reference path="../typings/request/request.d.ts" />
/// <reference path="../typings/xml2js/xml2js.d.ts" />
/// <reference path="../typings/bluebird/bluebird.d.ts" />
import request = require('request');
import Promise = require('bluebird');
import Message = require('./Message');
declare class User {
    username: string;
    password: string;
    type: User.Type;
    style: Message.Style;
    authenticated: boolean;
    cookies: request.CookieJar;
    static endpoint: string;
    endpoint_url: string;
    constructor(username?: string, password?: string);
    init(): Promise<any>;
    authenticate(): Promise<void>;
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
