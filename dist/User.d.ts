import { EventEmitter } from 'events';
import { ReadStream } from 'fs';
import * as request from 'request';
import * as Promise from 'bluebird';
import { Style, StylePartial, Background, BackgroundPartial } from './Message';
export declare enum UserTypes {
    Anon = 0,
    Temp = 1,
    Regi = 2,
}
export declare class User extends EventEmitter {
    name: string;
    password: string;
    type: UserTypes;
    id: string;
    ip: string;
    joined_at: number;
    style: Style;
    background: Background;
    _connection_ids: Set<string>;
    _inited: Promise<void>;
    private _cookies;
    readonly ENDPOINT: string;
    readonly is_inited: boolean;
    static Types: typeof UserTypes;
    static login(username: string, password: string): User;
    static parseAnonName(message: string, _id: string): string;
    constructor(name?: string, type?: UserTypes);
    toString(): string;
    private _initRegistered();
    private _init();
    private _authorize();
    getStyle(): Promise<Style>;
    private _getStyle();
    setStyle(style: StylePartial): Promise<void>;
    saveStyle(style?: StylePartial): Promise<Style>;
    getBackground(): Promise<Background>;
    private _getBackground();
    setBackground(background: BackgroundPartial): Promise<void>;
    saveBackground(background?: BackgroundPartial): Promise<Background>;
    saveBackgroundImage(stream: ReadStream): Promise<void>;
    getBackgroundImage(): request.Request;
    getAvatar(): request.Request;
    static getStyle(username: string): Promise<Style>;
    static getBackground(username: string): Promise<Background>;
    static getBackgroundImage(username: string): request.Request;
    static getAvatar(username: string): request.Request;
}
export default User;
