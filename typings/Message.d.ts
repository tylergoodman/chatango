/// <reference path="../typings/lodash/lodash.d.ts" />
import User = require('./User');
declare class Message implements Message.Style {
    id: string;
    room: string;
    user: User;
    body: string;
    stylesOn: boolean;
    fontFamily: number;
    fontSize: number;
    usebackground: number;
    textColor: string;
    nameColor: string;
    bold: boolean;
    italics: boolean;
    underline: boolean;
    constructor();
    static tokens: {
        MESSAGE_PARSE: RegExp;
    };
    static parse(raw: string): Message;
}
declare module Message {
    interface Style {
        stylesOn?: boolean;
        fontFamily?: number;
        fontSize?: number;
        usebackground?: number;
        textColor?: string;
        nameColor?: string;
        bold?: boolean;
        italics?: boolean;
        underline?: boolean;
    }
    interface Background {
        align?: string;
        ialp?: number;
        tile?: number;
        bgalp?: number;
        bgc?: string;
        useimg?: number;
        hasrec?: number;
        isvid?: number;
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
