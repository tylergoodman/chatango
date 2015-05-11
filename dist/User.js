/// <reference path="../typings/tsd.d.ts" />
var request = require('request');
var xml2js = require('xml2js');
var Promise = require('bluebird');
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
        this.request = request.defaults({ jar: true });
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
        return this.getBackground();
    };
    User.prototype.authenticate = function () {
        return new Promise(function (resolve, reject) {
        });
    };
    User.prototype.getStyle = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            request(_this.endpoint_url + "/msgstyles.json", function (error, response, body) {
                if (error) {
                    return reject(error);
                }
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
            return _this.style;
        });
    };
    User.prototype.getBackground = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            request(_this.endpoint_url + "/msgbg.xml", function (error, response, body) {
                if (error) {
                    return reject(error);
                }
                resolve(body);
            });
        })
            .then(function (body) {
            return new Promise(function (resolve, reject) {
                xml2js.parseString(body, function (err, result) {
                    if (err) {
                        return reject(err);
                    }
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
            return _this.style.background;
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
