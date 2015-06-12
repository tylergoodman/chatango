/// <reference path="../typings/tsd.d.ts" />
import User = require('./User');
declare module Message {
    class Message {
        id: string;
        room: string;
        user: User;
        body: string;
        style: Style;
        constructor();
        toString(): string;
    }
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
    var tokens: {
        MESSAGE_PARSE: RegExp;
        FORMAT: RegExp;
    };
    function parse(raw: string): Message;
}
export = Message;
