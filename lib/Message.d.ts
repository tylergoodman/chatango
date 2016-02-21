import User from './User';
import Room from './Room';
export declare class Message {
    id: string;
    user: User;
    created_at: number;
    body: string;
    style: Style;
    room: Room;
    constructor();
    toString(): string;
    static tokens: {
        MESSAGE_PARSE: RegExp;
        FORMAT: RegExp;
    };
    static parse(raw: string): Message;
}
export interface StyleAPIGet {
    stylesOn: boolean;
    fontFamily: string;
    fontSize: string;
    usebackground: string;
    textColor: string;
    nameColor: string;
    bold: boolean;
    italics: boolean;
    underline: boolean;
}
export declare class Style {
    stylesOn: boolean;
    fontFamily: number;
    fontSize: number;
    usebackground: number;
    textColor: string;
    nameColor: string;
    bold: boolean;
    italics: boolean;
    underline: boolean;
    constructor(args?: StyleAPIGet);
}
export declare class Background {
    align: string;
    ialp: number;
    tile: number;
    bgalp: number;
    bgc: string;
    useimg: number;
    hasrec: number;
    isvid: number;
    constructor(args?: BackgroundAPIGet);
}
export interface BackgroundAPIGet {
    bgi: {
        $: {
            align: string;
            bgalp: string;
            bgc: string;
            hasrec: string;
            ialp: string;
            isvid: string;
            tile: string;
            useimg: string;
        };
    };
}
export declare enum Font {
    Arial = 0,
    Comic = 1,
    Georgia = 2,
    Handwriting = 3,
    Impact = 4,
    Palatino = 5,
    Papyrus = 6,
    Times = 7,
    Typewriter = 8,
}
export interface MessageCacheOptions {
    size?: number;
}
export declare class MessageCache implements MessageCacheOptions {
    size: number;
    private _pending;
    private _cache;
    private _dict;
    private static DEFAULT_OPTIONS;
    constructor(options?: MessageCacheOptions);
    toString(): string;
    private _push(message, new_id);
    get(id: string | number): Message;
    getLast(): Message;
    submit(message: Message): void | Message;
    publish(id: string, new_id: string): void | Message;
    remove(id: string): void | Message;
}
export default Message;
