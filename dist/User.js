/// <reference path="../typings/request/request.d.ts" />
/// <reference path="../typings/xml2js/xml2js.d.ts" />
/// <reference path="../typings/bluebird/bluebird.d.ts" />
/// <reference path="../typings/winston/winston.d.ts" />
/// <reference path="../typings/lodash/lodash.d.ts" />
var request = require('request');
var xml2js = require('xml2js');
var Promise = require('bluebird');
var winston = require('winston');
var _ = require('lodash');
var Message = require('./Message');
var User = (function () {
    function User(username, password) {
        if (username === void 0) { username = ''; }
        if (password === void 0) { password = ''; }
        this.username = '';
        this.password = '';
        this.style = {
            name: '',
            font: {
                color: '',
                size: 11,
                face: Message.Font.Arial,
                bold: false,
                italics: false,
                underline: false
            },
            background: {
                align: 'tl',
                ialp: 100,
                tile: 1,
                bgalp: 100,
                bgc: '',
                useimg: 0,
                hasrec: 0,
                isvid: 0
            }
        };
        this.cookies = request.jar();
        this.username = username;
        this.password = password;
        if (!username && !password) {
            this.type = User.Type.Anonymous;
        }
        else if (!password) {
            this.type = User.Type.Temporary;
        }
        else {
            this.type = User.Type.Registered;
        }
    }
    Object.defineProperty(User.prototype, "endpoint_url", {
        get: function () {
            return User.endpoint + "/" + this.username.charAt(0) + "/" + this.username.charAt(1) + "/" + this.username;
        },
        enumerable: true,
        configurable: true
    });
    User.prototype.init = function () {
        var _this = this;
        return this.authenticate()
            .then(function () {
            return _this.getStyle();
        })
            .then(function () {
            return _this.getBackground();
        });
    };
    User.prototype.authenticate = function () {
        var _this = this;
        winston.log('silly', "Authenticating user " + this.username);
        return new Promise(function (resolve, reject) {
            request({
                url: 'http://scripts.st.chatango.com/setcookies',
                method: 'POST',
                jar: _this.cookies,
                form: {
                    pwd: _this.password,
                    sid: _this.username
                },
                headers: {
                    'User-Agent': 'ChatangoJS'
                }
            }, function (error, response, body) {
                if (error) {
                    winston.log('error', "Error while authenticating user " + _this.username + ": " + error);
                    return reject(error);
                }
                winston.log('info', "Authentication successful: " + _this.username);
                resolve();
            });
        });
    };
    User.prototype.getStyle = function () {
        var _this = this;
        winston.log('silly', "Getting style data for user " + this.username);
        return new Promise(function (resolve, reject) {
            request(_this.endpoint_url + "/msgstyles.json", function (error, response, body) {
                if (error) {
                    winston.log('error', "Error while retrieving style data for user " + _this.username);
                    return reject(error);
                }
                winston.log('silly', "Retrieved style data for user " + _this.username);
                resolve(JSON.parse(body));
            });
        })
            .then(function (style) {
            _this.style.name = style.nameColor;
            _this.style.font.color = style.textColor;
            _this.style.font.size = Number(style.fontSize);
            _this.style.font.face = Message.Font[style.fontFamily];
            _this.style.font.bold = style.bold;
            _this.style.font.italics = style.italics;
            _this.style.font.underline = style.underline;
            winston.log('verbose', "Retrieved style for user " + _this.username);
            return _this.style;
        });
    };
    User.prototype.getBackground = function () {
        var _this = this;
        winston.log('silly', "Getting background xml for user " + this.username);
        return new Promise(function (resolve, reject) {
            request(_this.endpoint_url + "/msgbg.xml", function (error, response, body) {
                if (error) {
                    winston.log('error', "Error while retrieving background xml for user " + _this.username);
                    return reject(error);
                }
                winston.log('silly', "Retrieved background xml for user " + _this.username);
                resolve(body);
            });
        })
            .then(function (body) {
            winston.log('silly', "Parsing background xml for " + _this.username);
            return new Promise(function (resolve, reject) {
                xml2js.parseString(body, function (err, result) {
                    if (err) {
                        winston.log('error', "Error while parsing background xml for user " + _this.username);
                        return reject(err);
                    }
                    winston.log('silly', "Parsed background xml for user " + _this.username);
                    resolve(result);
                });
            });
        })
            .then(function (result) {
            _this.style.background = {
                'align': result.bgi.$.align,
                'ialp': Number(result.bgi.$.ialp),
                'tile': Number(result.bgi.$.tile),
                'bgalp': Number(result.bgi.$.bgalp),
                'bgc': result.bgi.$.bgc,
                'useimg': Number(result.bgi.$.useimg),
                'hasrec': Number(result.bgi.$.hasrec),
                'isvid': Number(result.bgi.$.isvid),
            };
            winston.log('verbose', "Retrieved background for user " + _this.username);
            return _this.style.background;
        });
    };
    User.prototype.setBackground = function (background) {
        var _this = this;
        if (background === void 0) { background = this.style.background; }
        winston.log('silly', "Saving background for user " + this.username);
        var data = _.extend(this.style.background, background);
        data['lo'] = this.username;
        data['p'] = this.password;
        return new Promise(function (resolve, reject) {
            request({
                url: 'http://chatango.com/updatemsgbg',
                method: 'POST',
                jar: _this.cookies,
                form: data,
                headers: {
                    'User-Agent': 'ChatangoJS'
                }
            }, function (error, response, body) {
                if (error) {
                    winston.log('error', "Error while saving background for user " + _this.username + ": " + error);
                    return reject(error);
                }
                if (response.statusCode !== 200) {
                    winston.log('error', "Error while saving background for user " + _this.username + ": " + response.statusMessage + "\nAre you authenticated?");
                    return reject(new Error(response.statusMessage));
                }
                winston.log('verbose', "Saved background for user " + _this.username);
                resolve();
            });
        });
    };
    User.prototype.getBackgroundImage = function () {
        return request(this.endpoint_url + "/msgbg.jpg");
    };
    User.getBackgroundImage = function (username) {
        return this.prototype.getBackgroundImage.call({ username: username });
    };
    User.prototype.getAvatar = function () {
        return request(this.endpoint_url + "/thumb.jpg");
    };
    User.getAvatar = function (username) {
        return this.prototype.getAvatar.call({ username: username });
    };
    User.endpoint = 'http://ust.chatango.com/profileimg';
    return User;
})();
var User;
(function (User) {
    (function (Type) {
        Type[Type["Anonymous"] = 0] = "Anonymous";
        Type[Type["Temporary"] = 1] = "Temporary";
        Type[Type["Registered"] = 2] = "Registered";
    })(User.Type || (User.Type = {}));
    var Type = User.Type;
})(User || (User = {}));
module.exports = User;
