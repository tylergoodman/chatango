"use strict";
const events_1 = require('events');
const request = require('request');
const xml2js_1 = require('xml2js');
const Promise = require('bluebird');
const lodash_1 = require('lodash');
const Debug = require('debug');
const log = Debug('chatango:User:log');
const warn = Debug('chatango:User:warn');
const error = Debug('chatango:User:error');
const debug = Debug('chatango:User:debug');
const Message_1 = require('./Message');
(function (UserTypes) {
    UserTypes[UserTypes["Anon"] = 0] = "Anon";
    UserTypes[UserTypes["Temp"] = 1] = "Temp";
    UserTypes[UserTypes["Regi"] = 2] = "Regi";
})(exports.UserTypes || (exports.UserTypes = {}));
var UserTypes = exports.UserTypes;
class User extends events_1.EventEmitter {
    constructor(name, type) {
        super();
        this._connection_ids = new Set();
        this._cookies = request.jar();
        this.name = (name || '').toLowerCase();
        this.type = type || (this.name.length > 0 ? UserTypes.Temp : UserTypes.Anon);
        if (this.name.length > 0 && this.type === UserTypes.Regi) {
            this._init = this._initRegistered;
        }
        this.style = new Message_1.Style();
        this.background = new Message_1.Background();
        this._inited = this._init();
    }
    get ENDPOINT() {
        return `http://ust.chatango.com/profileimg/${this.name.charAt(0)}/${this.name.charAt(1)}/${this.name}`;
    }
    get is_inited() {
        return this._inited.isFulfilled();
    }
    static login(username, password) {
        let me = new User(username, User.Types.Regi);
        me.password = password;
        return me;
    }
    static parseAnonName(message, _id) {
        let n_tag;
        try {
            n_tag = message.match(/^<n(\d{4})\/>/)[1].split('');
        }
        catch (e) {
            return '';
        }
        const id = _id.slice(-4).split('');
        let ret = [];
        for (let i = 0; i < 4; i++) {
            const val = parseInt(n_tag[i], 10) + parseInt(id[i], 10);
            ret.push(val.toString(10).slice(-1));
        }
        const name = 'anon' + ret.join('');
        debug(`Parsed anonymous name "${name}"`);
        return name;
    }
    toString() {
        return this.name;
    }
    _initRegistered() {
        return this._inited = this._getStyle()
            .catch((err) => {
            error(`Error fetching style data for ${this.name}, using default.`);
            return this.style;
        })
            .then((style) => {
            this.style = style;
            return this._getBackground();
        })
            .catch((err) => {
            error(`Error fetching background data for ${this.name}, using default.`);
            return this.background;
        })
            .then((background) => {
            this.background = background;
            if (this.password === undefined) {
                return;
            }
            return this._authorize();
        })
            .then(() => {
            log(`Initialized ${this.name}`);
        });
    }
    _init() {
        return this._inited = Promise.resolve();
    }
    _authorize() {
        debug(`Authorizing ${this.name}`);
        return new Promise((resolve, reject) => {
            request({
                url: 'http://chatango.com/login',
                method: 'POST',
                jar: this._cookies,
                form: {
                    user_id: this.name,
                    password: this.password,
                    storecookie: 'on',
                    checkerrors: 'yes'
                },
                headers: {
                    'User-Agent': 'ChatangoJS',
                }
            }, (err, response, body) => {
                if (response.body.length !== 0) {
                    err = new Error(`Invalid credentials`);
                }
                if (err) {
                    error(`Error while authorizing ${this.name}: ${err}`);
                    return reject(err);
                }
                if (response.statusCode !== 200) {
                    error(`Error while authorizing ${this.name}: ${response.statusMessage}`);
                    return reject(new Error(`${response.statusCode}: ${response.statusMessage}`));
                }
                log(`Authorized ${this.name}`);
                resolve();
            });
        });
    }
    getStyle() {
        if (this.is_inited) {
            return Promise.resolve(this.style);
        }
        return this._inited.then(() => this.style);
    }
    _getStyle() {
        debug(`Getting style for ${this.name}`);
        return new Promise((resolve, reject) => {
            request(`${this.ENDPOINT}/msgstyles.json`, (err, response, body) => {
                if (err) {
                    error(`Error while retrieving style for ${this.name}: ${err}`);
                    return reject(err);
                }
                if (response.statusCode !== 200) {
                    error(`Error while retrieving style for ${this.name}: ${response.statusMessage}`);
                    return reject(new Error(`${response.statusCode}: ${response.statusMessage}`));
                }
                debug(`Retrieved style for ${this.name}`);
                if (response.headers['content-type'] === 'image/jpeg') {
                    debug(`User ${this.name} has no style data. Using default.`);
                    return resolve(new Message_1.Style());
                }
                try {
                    resolve(new Message_1.Style(JSON.parse(body)));
                }
                catch (err) {
                    error(`Errored parsing getStyle(): ${err}`);
                    reject(err);
                }
            });
        });
    }
    setStyle(style) {
        return this._inited.then(() => {
            debug(`Setting style for ${this.name}`);
            lodash_1.assign(this.style, style);
        });
    }
    saveStyle(style) {
        if (this.type !== User.Types.Regi) {
            throw new TypeError(`Tried to save style as a non-registered User: ${this.name}`);
        }
        return this.setStyle(style).then(() => {
            debug(`Saving style for ${this.name}`);
            return new Promise((resolve, reject) => {
                const data = {};
                for (let key in this.style) {
                    data[key] = String(this.style[key]);
                }
                request({
                    url: 'http://chatango.com/updatemsgstyles',
                    method: 'POST',
                    jar: this._cookies,
                    formData: lodash_1.assign(data, {
                        'lo': this.name,
                        'p': this.password,
                    }),
                    headers: {
                        'User-Agent': 'ChatangoJS',
                    }
                }, (err, response, body) => {
                    if (err) {
                        error(`Error while saving style for ${this.name}: ${err}`);
                        return reject(err);
                    }
                    if (response.statusCode !== 200) {
                        error(`Error while saving style for ${this.name}: ${response.statusMessage}`);
                        return reject(new Error(`${response.statusCode}: ${response.statusMessage}`));
                    }
                    log(`Saved style for ${this.name}`);
                    resolve(this.style);
                });
            });
        });
    }
    getBackground() {
        if (this.is_inited) {
            return Promise.resolve(this.background);
        }
        return this._inited.then(() => this.background);
    }
    _getBackground() {
        debug(`Getting background for ${this.name}`);
        return new Promise((resolve, reject) => {
            request(`${this.ENDPOINT}/msgbg.xml`, (err, response, body) => {
                if (err) {
                    error(`Error while retrieving background for ${this.name}: ${err}`);
                    return reject(err);
                }
                if (response.statusCode !== 200) {
                    error(`Error while retrieving background for ${this.name}: ${response.statusMessage}`);
                    return reject(new Error(`${response.statusCode}: ${response.statusMessage}`));
                }
                debug(`Retrieved background for ${this.name}`);
                resolve(response);
            });
        })
            .then((response) => {
            debug(`Parsing background for ${this.name}`);
            return new Promise((resolve, reject) => {
                if (response.headers['content-type'] === 'image/jpeg') {
                    debug(`User ${this.name} has no background data. Using default.`);
                    return resolve(new Message_1.Background());
                }
                xml2js_1.parseString(response.body, (err, result) => {
                    if (err) {
                        error(`Error while parsing background for ${this.name}: ${err}`);
                        return reject(err);
                    }
                    debug(`Parsed background for ${this.name}`);
                    resolve(new Message_1.Background(result));
                });
            });
        });
    }
    setBackground(background) {
        return this._inited.then(() => {
            debug(`Setting background for ${this.name}`);
            lodash_1.assign(this.background, background);
        });
    }
    saveBackground(background) {
        if (this.type !== User.Types.Regi) {
            throw new TypeError(`Tried to save background style as a non-registered User: ${this.name}`);
        }
        return this.setBackground(background).then(() => {
            debug(`Saving background for ${this.name}`);
            return new Promise((resolve, reject) => {
                request({
                    url: 'http://chatango.com/updatemsgbg',
                    method: 'POST',
                    jar: this._cookies,
                    form: lodash_1.assign({
                        'lo': this.name,
                        'p': this.password
                    }, this.background),
                    headers: {
                        'User-Agent': 'ChatangoJS'
                    }
                }, (err, response, body) => {
                    if (err) {
                        error(`Error while saving background for ${this.name}: ${err}`);
                        return reject(err);
                    }
                    if (response.statusCode !== 200) {
                        error(`Error while saving background for ${this.name}: ${response.statusMessage}`);
                        return reject(new Error(`${response.statusCode}: ${response.statusMessage}`));
                    }
                    log(`Saved background for ${this.name}`);
                    resolve(this.background);
                });
            });
        });
    }
    saveBackgroundImage(stream) {
        debug(`Saving background image for ${this.name}`);
        return this._inited.then(() => {
            return new Promise((resolve, reject) => {
                request({
                    url: 'http://chatango.com/updatemsgbg',
                    method: 'POST',
                    jar: this._cookies,
                    headers: {
                        'User-Agent': 'ChatangoJS'
                    },
                    formData: {
                        'lo': this.name,
                        'p': this.password,
                        'Filedata': stream
                    }
                }, (err, response, body) => {
                    if (err) {
                        error(`Error while saving background image for ${this.name}: ${err}`);
                        return reject(err);
                    }
                    if (response.statusCode !== 200) {
                        error(`Error while saving background for ${this.name}: ${response.statusMessage} => Are you authenticated?`);
                        return reject(new Error(`${response.statusCode}: ${response.statusMessage}`));
                    }
                    log(`Saved background image for ${this.name}`);
                    resolve();
                });
            });
        });
    }
    getBackgroundImage() {
        return request(`${this.ENDPOINT}/msgbg.jpg`);
    }
    getAvatar() {
        return request(`${this.ENDPOINT}/thumb.jpg`);
    }
    static getStyle(username) {
        return new User(username)._getStyle();
    }
    static getBackground(username) {
        return new User(username)._getBackground();
    }
    static getBackgroundImage(username) {
        return new User(username).getBackgroundImage();
    }
    static getAvatar(username) {
        return new User(username).getAvatar();
    }
}
User.Types = UserTypes;
exports.User = User;
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = User;
