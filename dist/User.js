/// <reference path="../typings/tsd.d.ts" />
var request = require('request');
var xml2js = require('xml2js');
var Promise = require('bluebird');
var winston = require('winston');
var _ = require('lodash');
var Message = require('./Message');
var util = require('./util');
var User = (function () {
    function User(name, password) {
        this.joined_at = 0;
        this.style = new Message.Style;
        this.background = new Message.Background;
        this._ips = new util.Set();
        this._ids = new util.Set();
        this._cookies = request.jar();
        this.name = name;
        this.password = password;
    }
    Object.defineProperty(User.prototype, "ENDPOINT", {
        get: function () {
            return "http://ust.chatango.com/profileimg/" + this.name.charAt(0) + "/" + this.name.charAt(1) + "/" + this.name;
        },
        enumerable: true,
        configurable: true
    });
    User.prototype.toString = function () {
        return "" + this.name;
    };
    User.prototype.init = function () {
        var _this = this;
        var promise;
        if (this.password) {
            promise = this.authenticate();
        }
        else {
            promise = Promise.resolve();
        }
        return promise
            .then(function () {
            return _this.getStyle();
        })
            .then(function (style) {
            _this.style = style;
        })
            .then(function () {
            return _this.getBackground();
        })
            .then(function (background) {
            _this.background = background;
        });
    };
    User.prototype.authenticate = function () {
        var _this = this;
        winston.log('debug', "Authenticating user \"" + this.name + "\"");
        return new Promise(function (resolve, reject) {
            request({
                url: 'http://scripts.st.chatango.com/setcookies',
                method: 'POST',
                jar: _this._cookies,
                form: {
                    pwd: _this.password,
                    sid: _this.name
                },
                headers: {
                    'User-Agent': 'ChatangoJS'
                }
            }, function (error, response, body) {
                if (error) {
                    winston.log('error', "Error while authenticating user \"" + _this.name + "\": " + error);
                    return reject(error);
                }
                winston.log('info', "Authentication successful: \"" + _this.name + "\"");
                resolve();
            });
        });
    };
    User.prototype.getStyle = function () {
        var _this = this;
        winston.log('debug', "Getting style for user \"" + this.name + "\"");
        return new Promise(function (resolve, reject) {
            request(_this.ENDPOINT + "/msgstyles.json", function (error, response, body) {
                if (error) {
                    winston.log('error', "Error while retrieving style for user \"" + _this.name + "\"");
                    return reject(error);
                }
                if (response.statusCode !== 200) {
                    winston.log('error', "Error while retrieving style for user \"" + _this.name + "\": " + response.statusMessage);
                    return reject(new Error(response.statusCode + ": " + response.statusMessage));
                }
                winston.log('verbose', "Retrieved style for user \"" + _this.name + "\"");
                var style = JSON.parse(body);
                style.fontSize = Number(style.fontSize);
                style.usebackground = Number(style.usebackground);
                resolve(style);
            });
        });
    };
    User.prototype.setStyle = function (style) {
        var _this = this;
        if (style === void 0) { style = new Message.Style; }
        winston.log('debug', "Saving style for user \"" + this.name + "\"");
        style = _.extend(this.style, style);
        var data = _.transform(style, function (result, value, key) {
            result[key] = String(value);
        });
        return new Promise(function (resolve, reject) {
            request({
                url: 'http://chatango.com/updatemsgstyles',
                method: 'POST',
                jar: _this._cookies,
                formData: _.extend({
                    'lo': _this.name,
                    'p': _this.password,
                }, data),
                headers: {
                    'User-Agent': 'ChatangoJS',
                }
            }, function (error, response, body) {
                if (error) {
                    winston.log('error', "Error while saving style for user \"" + _this.name + "\": " + error);
                    return reject(error);
                }
                if (response.statusCode !== 200) {
                    winston.log('error', "Error while saving style for user \"" + _this.name + "\": " + response.statusMessage);
                    return reject(new Error(response.statusCode + ": " + response.statusMessage));
                }
                winston.log('verbose', "Saved style for user \"" + _this.name + "\"");
                _this.style = style;
                resolve(style);
            });
        });
    };
    User.prototype.getBackground = function () {
        var _this = this;
        winston.log('debug', "Getting background for user \"" + this.name + "\"");
        return new Promise(function (resolve, reject) {
            request(_this.ENDPOINT + "/msgbg.xml", function (error, response, body) {
                if (error) {
                    winston.log('error', "Error while retrieving background for user \"" + _this.name + "\"");
                    return reject(error);
                }
                if (response.statusCode !== 200) {
                    winston.log('error', "Error while retrieving background for user \"" + _this.name + "\": " + response.statusMessage);
                    return reject(new Error(response.statusCode + ": " + response.statusMessage));
                }
                winston.log('silly', "Retrieved background for user \"" + _this.name + "\"");
                resolve(response);
            });
        })
            .then(function (response) {
            winston.log('silly', "Parsing background for \"" + _this.name + "\"");
            return new Promise(function (resolve, reject) {
                if (response.headers['content-type'] === 'image/jpeg') {
                    winston.log('warn', "User \"" + _this.name + "\" has no background data. Using default.");
                    _this.background = new Message.Background;
                    return resolve(_this.background);
                }
                xml2js.parseString(response.body, function (err, result) {
                    if (err) {
                        winston.log('error', "Error while parsing background for user \"" + _this.name + "\"");
                        return reject(err);
                    }
                    winston.log('verbose', "Retrieved background for user \"" + _this.name + "\"");
                    _this.background = new Message.Background(result);
                    resolve(_this.background);
                });
            });
        });
    };
    User.prototype.setBackground = function (background) {
        var _this = this;
        if (background === void 0) { background = new Message.Background; }
        winston.log('silly', "Saving background for user \"" + this.name + "\"");
        background = _.extend(this.background, background);
        return new Promise(function (resolve, reject) {
            request({
                url: 'http://chatango.com/updatemsgbg',
                method: 'POST',
                jar: _this._cookies,
                form: _.extend(background, {
                    'lo': _this.name,
                    'p': _this.password
                }),
                headers: {
                    'User-Agent': 'ChatangoJS'
                }
            }, function (error, response, body) {
                if (error) {
                    winston.log('error', "Error while saving background for user \"" + _this.name + "\": " + error);
                    return reject(error);
                }
                if (response.statusCode !== 200) {
                    winston.log('error', "Error while saving background for user \"" + _this.name + "\": " + response.statusMessage);
                    return reject(new Error(response.statusCode + ": " + response.statusMessage));
                }
                winston.log('verbose', "Saved background for user \"" + _this.name + "\"");
                _this.background = background;
                resolve(background);
            });
        });
    };
    User.prototype.setBackgroundImage = function (stream) {
        var _this = this;
        winston.log('silly', "Saving background image for user \"" + this.name + "\"");
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
            }, function (error, response, body) {
                if (error) {
                    winston.log('error', "Error while saving background image for user \"" + _this.name + "\": " + error);
                    return reject(error);
                }
                if (response.statusCode !== 200) {
                    winston.log('error', "Error while saving background for user \"" + _this.name + "\": " + response.statusMessage + "\nAre you authenticated?");
                    return reject(new Error(response.statusCode + ": " + response.statusMessage));
                }
                winston.log('verbose', "Set background image for user \"" + _this.name + "\"");
                resolve();
            });
        });
    };
    User.prototype.getBackgroundImage = function () {
        return request(this.ENDPOINT + "/msgbg.jpg");
    };
    User.prototype.getAvatar = function () {
        return request(this.ENDPOINT + "/thumb.jpg");
    };
    User.parseAnonName = function (message, _id) {
        var n_tag = message.match(/^<n(\d{4})\/>/)[1].split('');
        var id = _id.slice(-4).split('');
        var ret = [];
        for (var i = 0; i < 4; i++) {
            var val = parseInt(n_tag[i], 10) + parseInt(id[i], 10);
            ret.push(String(val).slice(-1));
        }
        var name = 'anon' + ret.join('');
        winston.log('debug', "Parsed anonymous user name \"" + name + "\"");
        return name;
    };
    User.getStyle = function (username) {
        return new User(username).getStyle();
    };
    User.getBackground = function (username) {
        return new User(username).getBackground();
    };
    User.getBackgroundImage = function (username) {
        return new User(username).getBackgroundImage();
    };
    User.getAvatar = function (username) {
        return new User(username).getAvatar();
    };
    return User;
})();
module.exports = User;
