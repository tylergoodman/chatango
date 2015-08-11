/// <reference path="../typings/tsd.d.ts" />
import events = require('events');
import Promise = require('bluebird');
import User = require('./User');
import Message = require('./Message');
import util = require('./util');
declare class Room extends events.EventEmitter {
    name: string;
    user: string | User;
    id: string;
    session_id: string;
    owner: string;
    ip: string;
    server_time: number;
    here_now: number;
    moderators: util.Set<string>;
    users: {
        [index: string]: User;
    };
    private _connection;
    private _history;
    private _last_message;
    private _buffer;
    private _first_send;
    private _anonymous;
    private _ping;
    private static TIMEOUT;
    constructor(name: string, user?: string | User, options?: Room.Options);
    private _bold;
    bold: boolean;
    private _italics;
    italics: boolean;
    private _underline;
    underline: boolean;
    private _reset();
    private _send(command);
    private _receiveData(data);
    private _pingTask();
    private _startPing();
    private _stopPing();
    private _restartPing();
    private _getServer(room_name?);
    connect(): Promise<Room>;
    disconnect(): Promise<void>;
    message(content: string): Room;
    delete(message: string | Message): Room;
    deleteAll(user: Message | User.ID): Room;
    ban(user: Message | User.ID): Room;
    unban(user: Message | User.ID): Room;
    __command__ok(owner: string, session_id: string, session_status: string, username: string, server_time: string, ip: string, moderators: string, server_id: string): void;
    __command__i(): void;
    __command__nomore(): void;
    __command__inited(): void;
    __command__pwdok(): void;
    __command__aliasok(): void;
    __command__n(num_users: string): void;
    __command__b(): void;
    __command__u(old_id: string, new_id: string): void;
    __command__mods(modlist: string): void;
    __command__gparticipants(num_unregistered: string, ...users: string[]): void;
    __command__participant(status: string, connection_id: string, session_id: string, user_registered: string, user_temporary: string, no_idea: string, joined_at: string): void;
    __command__badalias(): void;
    __command__show_nlp(): void;
    __command__nlptb(): void;
    __command__show_fw(): void;
    __command__show_tb(seconds: string): void;
    __command__tb(seconds_remaining: string): void;
    __command__climited(server_time: string, ...request: string[]): void;
    __command__delete(message_id: string): void;
    __command__deleteall(...message_ids: string[]): void;
    __command__blocked(id: string, ip: string, name: string, server_time: string): void;
    private _parseMessage(created_at, user_registered, user_temporary, user_session_id, user_id, message_id, user_ip, no_idea, no_idea2, ...raw_message);
}
declare module Room {
    interface Options {
        cache_size: number;
    }
}
export = Room;
