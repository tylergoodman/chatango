"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var events_1 = require('events');
var request = require('request');
var xml2js_1 = require('xml2js');
var Promise = require('bluebird');
var lodash_1 = require('lodash');
var Debug = require('debug');
var log = Debug('chatango:User:log');
var warn = Debug('chatango:User:warn');
var error = Debug('chatango:User:error');
var debug = Debug('chatango:User:debug');
var Message_1 = require('./Message');
(function (UserTypes) {
    UserTypes[UserTypes["Anon"] = 0] = "Anon";
    UserTypes[UserTypes["Temp"] = 1] = "Temp";
    UserTypes[UserTypes["Regi"] = 2] = "Regi";
})(exports.UserTypes || (exports.UserTypes = {}));
var UserTypes = exports.UserTypes;
var User = (function (_super) {
    __extends(User, _super);
    function User(name, type) {
        _super.call(this);
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
    Object.defineProperty(User.prototype, "ENDPOINT", {
        get: function () {
            return "http://ust.chatango.com/profileimg/" + this.name.charAt(0) + "/" + this.name.charAt(1) + "/" + this.name;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(User.prototype, "is_inited", {
        get: function () {
            return this._inited.isFulfilled();
        },
        enumerable: true,
        configurable: true
    });
    User.login = function (username, password) {
        var me = new User(username, User.Types.Regi);
        me.password = password;
        return me;
    };
    User.parseAnonName = function (message, _id) {
        var n_tag;
        try {
            n_tag = message.match(/^<n(\d{4})\/>/)[1].split('');
        }
        catch (e) {
            return '';
        }
        var id = _id.slice(-4).split('');
        var ret = [];
        for (var i = 0; i < 4; i++) {
            var val = parseInt(n_tag[i], 10) + parseInt(id[i], 10);
            ret.push(val.toString(10).slice(-1));
        }
        var name = 'anon' + ret.join('');
        debug("Parsed anonymous name \"" + name + "\"");
        return name;
    };
    User.prototype.toString = function () {
        return this.name;
    };
    User.prototype._initRegistered = function () {
        var _this = this;
        return this._inited = this._getStyle()
            .catch(function (err) {
            error("Error fetching style data for " + _this.name + ", using default.");
            return _this.style;
        })
            .then(function (style) {
            _this.style = style;
            return _this._getBackground();
        })
            .catch(function (err) {
            error("Error fetching background data for " + _this.name + ", using default.");
            return _this.background;
        })
            .then(function (background) {
            _this.background = background;
            if (_this.password === undefined) {
                return;
            }
            return _this._authorize();
        })
            .then(function () {
            log("Initialized " + _this.name);
        });
    };
    User.prototype._init = function () {
        return this._inited = Promise.resolve();
    };
    User.prototype._authorize = function () {
        var _this = this;
        debug("Authorizing " + this.name);
        return new Promise(function (resolve, reject) {
            request({
                url: 'http://chatango.com/login',
                method: 'POST',
                jar: _this._cookies,
                form: {
                    user_id: _this.name,
                    password: _this.password,
                    storecookie: 'on',
                    checkerrors: 'yes'
                },
                headers: {
                    'User-Agent': 'ChatangoJS',
                }
            }, function (err, response, body) {
                if (response.body.length !== 0) {
                    err = new Error("Invalid credentials");
                }
                if (err) {
                    error("Error while authorizing " + _this.name + ": " + err);
                    return reject(err);
                }
                if (response.statusCode !== 200) {
                    error("Error while authorizing " + _this.name + ": " + response.statusMessage);
                    return reject(new Error(response.statusCode + ": " + response.statusMessage));
                }
                log("Authorized " + _this.name);
                resolve();
            });
        });
    };
    User.prototype.getStyle = function () {
        var _this = this;
        if (this.is_inited) {
            return Promise.resolve(this.style);
        }
        return this._inited.then(function () { return _this.style; });
    };
    User.prototype._getStyle = function () {
        var _this = this;
        debug("Getting style for " + this.name);
        return new Promise(function (resolve, reject) {
            request(_this.ENDPOINT + "/msgstyles.json", function (err, response, body) {
                if (err) {
                    error("Error while retrieving style for " + _this.name + ": " + err);
                    return reject(err);
                }
                if (response.statusCode !== 200) {
                    error("Error while retrieving style for " + _this.name + ": " + response.statusMessage);
                    return reject(new Error(response.statusCode + ": " + response.statusMessage));
                }
                debug("Retrieved style for " + _this.name);
                if (response.headers['content-type'] === 'image/jpeg') {
                    debug("User " + _this.name + " has no style data. Using default.");
                    return resolve(new Message_1.Style());
                }
                try {
                    resolve(new Message_1.Style(JSON.parse(body)));
                }
                catch (err) {
                    error("Errored parsing getStyle(): " + err);
                    reject(err);
                }
            });
        });
    };
    User.prototype.setStyle = function (style) {
        var _this = this;
        return this._inited.then(function () {
            debug("Setting style for " + _this.name);
            lodash_1.assign(_this.style, style);
        });
    };
    User.prototype.saveStyle = function (style) {
        var _this = this;
        if (this.type !== User.Types.Regi) {
            throw new TypeError("Tried to save style as a non-registered User: " + this.name);
        }
        return this.setStyle(style).then(function () {
            debug("Saving style for " + _this.name);
            return new Promise(function (resolve, reject) {
                var data = {};
                for (var key in _this.style) {
                    data[key] = String(_this.style[key]);
                }
                request({
                    url: 'http://chatango.com/updatemsgstyles',
                    method: 'POST',
                    jar: _this._cookies,
                    formData: lodash_1.assign(data, {
                        'lo': _this.name,
                        'p': _this.password,
                    }),
                    headers: {
                        'User-Agent': 'ChatangoJS',
                    }
                }, function (err, response, body) {
                    if (err) {
                        error("Error while saving style for " + _this.name + ": " + err);
                        return reject(err);
                    }
                    if (response.statusCode !== 200) {
                        error("Error while saving style for " + _this.name + ": " + response.statusMessage);
                        return reject(new Error(response.statusCode + ": " + response.statusMessage));
                    }
                    log("Saved style for " + _this.name);
                    resolve(_this.style);
                });
            });
        });
    };
    User.prototype.getBackground = function () {
        var _this = this;
        if (this.is_inited) {
            return Promise.resolve(this.background);
        }
        return this._inited.then(function () { return _this.background; });
    };
    User.prototype._getBackground = function () {
        var _this = this;
        debug("Getting background for " + this.name);
        return new Promise(function (resolve, reject) {
            request(_this.ENDPOINT + "/msgbg.xml", function (err, response, body) {
                if (err) {
                    error("Error while retrieving background for " + _this.name + ": " + err);
                    return reject(err);
                }
                if (response.statusCode !== 200) {
                    error("Error while retrieving background for " + _this.name + ": " + response.statusMessage);
                    return reject(new Error(response.statusCode + ": " + response.statusMessage));
                }
                debug("Retrieved background for " + _this.name);
                resolve(response);
            });
        })
            .then(function (response) {
            debug("Parsing background for " + _this.name);
            return new Promise(function (resolve, reject) {
                if (response.headers['content-type'] === 'image/jpeg') {
                    debug("User " + _this.name + " has no background data. Using default.");
                    return resolve(new Message_1.Background());
                }
                xml2js_1.parseString(response.body, function (err, result) {
                    if (err) {
                        error("Error while parsing background for " + _this.name + ": " + err);
                        return reject(err);
                    }
                    debug("Parsed background for " + _this.name);
                    resolve(new Message_1.Background(result));
                });
            });
        });
    };
    User.prototype.setBackground = function (background) {
        var _this = this;
        return this._inited.then(function () {
            debug("Setting background for " + _this.name);
            lodash_1.assign(_this.background, background);
        });
    };
    User.prototype.saveBackground = function (background) {
        var _this = this;
        if (this.type !== User.Types.Regi) {
            throw new TypeError("Tried to save background style as a non-registered User: " + this.name);
        }
        return this.setBackground(background).then(function () {
            debug("Saving background for " + _this.name);
            return new Promise(function (resolve, reject) {
                request({
                    url: 'http://chatango.com/updatemsgbg',
                    method: 'POST',
                    jar: _this._cookies,
                    form: lodash_1.assign({
                        'lo': _this.name,
                        'p': _this.password
                    }, _this.background),
                    headers: {
                        'User-Agent': 'ChatangoJS'
                    }
                }, function (err, response, body) {
                    if (err) {
                        error("Error while saving background for " + _this.name + ": " + err);
                        return reject(err);
                    }
                    if (response.statusCode !== 200) {
                        error("Error while saving background for " + _this.name + ": " + response.statusMessage);
                        return reject(new Error(response.statusCode + ": " + response.statusMessage));
                    }
                    log("Saved background for " + _this.name);
                    resolve(_this.background);
                });
            });
        });
    };
    User.prototype.saveBackgroundImage = function (stream) {
        var _this = this;
        debug("Saving background image for " + this.name);
        return this._inited.then(function () {
            return new Promise(function (resolve, reject) {
                request({
                    url: 'http://chatango.com/updatemsgbg',
                    method: 'POST',
                    jar: _this._cookies,
                    headers: {
                        'User-Agent': 'ChatangoJS'
                    },
                    formData: {
                        'lo': _this.name,
                        'p': _this.password,
                        'Filedata': stream
                    }
                }, function (err, response, body) {
                    if (err) {
                        error("Error while saving background image for " + _this.name + ": " + err);
                        return reject(err);
                    }
                    if (response.statusCode !== 200) {
                        error("Error while saving background for " + _this.name + ": " + response.statusMessage + " => Are you authenticated?");
                        return reject(new Error(response.statusCode + ": " + response.statusMessage));
                    }
                    log("Saved background image for " + _this.name);
                    resolve();
                });
            });
        });
    };
    User.prototype.getBackgroundImage = function () {
        return request(this.ENDPOINT + "/msgbg.jpg");
    };
    User.prototype.getAvatar = function () {
        return request(this.ENDPOINT + "/thumb.jpg");
    };
    User.getStyle = function (username) {
        return new User(username)._getStyle();
    };
    User.getBackground = function (username) {
        return new User(username)._getBackground();
    };
    User.getBackgroundImage = function (username) {
        return new User(username).getBackgroundImage();
    };
    User.getAvatar = function (username) {
        return new User(username).getAvatar();
    };
    User.Types = UserTypes;
    return User;
}(events_1.EventEmitter));
exports.User = User;
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = User;
