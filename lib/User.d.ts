import { EventEmitter } from 'events';
import { ReadStream } from 'fs';
import * as request from 'request';
import * as Promise from 'bluebird';
import { Style, Background } from './Message';
export declare enum UserTypes {
    Anon = 0,
    Temp = 1,
    Regi = 2,
}
export declare class User extends EventEmitter {
    name: string;
    password: string;
    type: UserTypes;
    style: Style;
    background: Background;
    id: string;
    ip: string;
    joined_at: number;
    _connection_ids: Set<string>;
    private _cookies;
    ENDPOINT: string;
    static Types: typeof UserTypes;
    static parseAnonName(message: string, _id: string): string;
    constructor(name?: string, password?: string);
    toString(): string;
    private _getDataRegistered();
    _getData(): Promise<void>;
    authorize(): Promise<void>;
    getStyle(): Promise<Style>;
    setStyle(style?: Style): Promise<Style>;
    getBackground(): Promise<Background>;
    setBackground(background?: Background): Promise<Background>;
    setBackgroundImage(stream: ReadStream): Promise<void>;
    getBackgroundImage(): request.Request;
    getAvatar(): request.Request;
    static getStyle(username: string): Promise<Style>;
    static getBackground(username: string): Promise<Background>;
    static getBackgroundImage(username: string): request.Request;
    static getAvatar(username: string): request.Request;
}
export default User;
