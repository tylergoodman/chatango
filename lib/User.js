"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const querystring = require("querystring");
const Debug = require("debug");
const fetch_1 = require("./helpers/fetch");
const parseXML_1 = require("./helpers/parseXML");
const parseCookies_1 = require("./helpers/parseCookies");
const debug = Debug('chatango:User');
var UserType;
(function (UserType) {
    UserType[UserType["Anon"] = 0] = "Anon";
    UserType[UserType["Temp"] = 1] = "Temp";
    UserType[UserType["Registered"] = 2] = "Registered";
})(UserType || (UserType = {}));
;
var UserSettings;
(function (UserSettings) {
    let Font;
    (function (Font) {
        Font[Font["Arial"] = 0] = "Arial";
        Font[Font["Comic"] = 1] = "Comic";
        Font[Font["Georgia"] = 2] = "Georgia";
        Font[Font["Handwriting"] = 3] = "Handwriting";
        Font[Font["Impact"] = 4] = "Impact";
        Font[Font["Palatino"] = 5] = "Palatino";
        Font[Font["Papyrus"] = 6] = "Papyrus";
        Font[Font["Times"] = 7] = "Times";
        Font[Font["Typewriter"] = 8] = "Typewriter";
    })(Font || (Font = {}));
    class Style {
        constructor() {
            this.stylesOn = false;
            this.fontFamily = 0;
            this.fontSize = 11;
            this.usebackground = 0;
            this.textColor = '000000';
            this.nameColor = '000000';
            this.bold = false;
            this.italics = false;
            this.underline = false;
        }
        static fromAPIGet(json) {
            const style = new Style();
            style.stylesOn = json.stylesOn;
            style.fontFamily = Number.parseInt(json.fontFamily, 10);
            style.fontSize = Number.parseInt(json.fontSize, 10);
            style.usebackground = Number.parseInt(json.usebackground, 10);
            style.textColor = json.textColor;
            style.nameColor = json.nameColor;
            style.bold = json.bold;
            style.italics = json.italics;
            style.underline = json.underline;
            return style;
        }
    }
    Style.Font = Font;
    UserSettings.Style = Style;
    class Background {
        constructor() {
            this.align = 'tl';
            this.ialp = 100;
            this.tile = 0;
            this.bgalp = 100;
            this.bgc = '';
            this.useimg = 0;
            this.hasrec = 0;
            this.isvid = 0;
        }
        static fromAPIGet(json) {
            const background = new Background();
            background.align = json.bgi.$.align;
            background.ialp = Number.parseInt(json.bgi.$.ialp, 10);
            background.tile = Number.parseInt(json.bgi.$.tile, 10);
            background.bgalp = Number.parseInt(json.bgi.$.bgalp, 10);
            background.bgc = json.bgi.$.bgc;
            background.useimg = Number.parseInt(json.bgi.$.useimg, 10);
            background.hasrec = Number.parseInt(json.bgi.$.hasrec, 10);
            background.isvid = Number.parseInt(json.bgi.$.isvid, 10);
            return background;
        }
    }
    UserSettings.Background = Background;
})(UserSettings = exports.UserSettings || (exports.UserSettings = {}));
class User extends events_1.EventEmitter {
    constructor(name, password, type = UserType.Registered) {
        super();
        this.name = name;
        this.password = password;
        this.type = type;
    }
    static parseAnonName(message, _id) {
        let n_tag;
        try {
            n_tag = message.match(/^<n(\d{4})\/>/)[1].split('');
        }
        catch (e) {
            console.warn(`Failed to parse anonymous name "${message}"`, e);
            return '';
        }
        const id = _id.slice(-4).split('');
        const digits = [];
        for (let i = 0; i < 4; i++) {
            const val = Number.parseInt(n_tag[i], 10) + Number.parseInt(id[i], 10);
            digits.push(val.toString(10).slice(-1));
        }
        const name = `anon${digits.join('')}`;
        debug(`Parsed anonymous name "${name}"`);
        return name;
    }
    static getEndpoint(name) {
        return `http://ust.chatango.com/profileimg/${name.charAt(0)}/${name.charAt(1)}/${name}`;
    }
    static getStyle(name) {
        return __awaiter(this, void 0, void 0, function* () {
            debug(`Getting style for "${name}"`);
            try {
                const res = yield fetch_1.default(`${User.getEndpoint(name)}/msgstyles.json`);
                if (res.status !== 200) {
                    throw new Error(`${res.status}: ${yield res.text()}`);
                }
                debug(`Got style for "${name}"`);
                if (res.headers.get('content-type') === 'image/jpeg') {
                    debug(`User "${name}" has no style data. Using default.`);
                    return new UserSettings.Style();
                }
                const json = yield res.json();
                return UserSettings.Style.fromAPIGet(json);
            }
            catch (err) {
                debug(`Error while getting style for "${name}": ${err}`);
                throw err;
            }
        });
    }
    static getBackground(name) {
        return __awaiter(this, void 0, void 0, function* () {
            debug(`Getting background for "${name}"`);
            try {
                const res = yield fetch_1.default(`${User.getEndpoint(name)}/msgbg.xml`);
                if (res.status !== 200) {
                    throw new Error(`${res.status}: ${yield res.text()}`);
                }
                debug(`Got background for "${name}"`);
                if (res.headers.get('content-type') === 'image/jpeg') {
                    debug(`User "${name}" has no background data. Using default.`);
                    return new UserSettings.Background();
                }
                const json = yield parseXML_1.default(yield res.text());
                return UserSettings.Background.fromAPIGet(json);
            }
            catch (err) {
                debug(`Error while getting background for "${name}": ${err}`);
                throw err;
            }
        });
    }
    getStyle() {
        return User.getStyle(this.name);
    }
    getBackground() {
        return User.getBackground(this.name);
    }
    static getToken(name, password) {
        return __awaiter(this, void 0, void 0, function* () {
            debug(`Getting token for "${name}"`);
            try {
                const res = yield fetch_1.default('http://chatango.com/login', {
                    method: 'POST',
                    body: querystring.stringify({
                        user_id: name,
                        password: password,
                        storecookie: 'on',
                        checkerrors: 'yes',
                    }),
                });
                if (res.status !== 200) {
                    throw new Error(`${res.status}: ${res.statusText}`);
                }
                const body = yield res.text();
                if (body.length !== 0) {
                    throw new Error('Invalid credentials');
                }
                debug(`Got token for "${name}"`);
                const cookies = parseCookies_1.default(res.headers);
                const auth = cookies.find(({ name }) => name === 'auth.chatango.com');
                console.log(auth);
                console.log(cookies);
                return auth.value;
            }
            catch (err) {
                debug(`Error while getting token for "${name}": ${err}`);
                throw err;
            }
        });
    }
    _getToken() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._auth) {
                return this._auth;
            }
            const auth = yield User.getToken(this.name, this.password);
            return this._auth = auth;
        });
    }
    static setStyle(name, password, style, opts = { save: false }) {
        return __awaiter(this, void 0, void 0, function* () {
        });
    }
}
User.Type = UserType;
exports.default = User;
