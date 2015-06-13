/// <reference path="../typings/tsd.d.ts" />
import User = require('./User');
import Room = require('./Room');
declare class Message {
    id: string;
    room: Room;
    user: User | string;
    created_at: number;
    body: string;
    style: Message.Style;
    constructor();
    toString(): string;
    static tokens: {
        MESSAGE_PARSE: RegExp;
        FORMAT: RegExp;
    };
    static parse(raw: string): Message;
}
declare module Message {
    class Style {
        [index: string]: any;
        stylesOn: boolean;
        fontFamily: number;
        fontSize: number;
        usebackground: number;
        textColor: string;
        nameColor: string;
        bold: boolean;
        italics: boolean;
        underline: boolean;
    }
    class Background {
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
    interface BackgroundAPIGet {
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
    enum Font {
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
}
export = Message;
