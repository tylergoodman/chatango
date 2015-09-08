/// <reference path="../typings/tsd.d.ts" />
var _ = require('lodash');
var Message = (function () {
    function Message() {
        this.style = new Message.Style;
    }
    Message.prototype.toString = function () {
        return this.user.toString() + ": " + this.body;
    };
    Message.parse = function (raw) {
        var message = new Message;
        var _a = raw.match(Message.tokens.MESSAGE_PARSE), input = _a[0], nameColor = _a[1], fontSize = _a[2], textColor = _a[3], fontFamily = _a[4], body = _a[5];
        if (nameColor)
            message.style.nameColor = nameColor;
        if (fontSize)
            message.style.fontSize = parseInt(fontSize, 10);
        if (textColor)
            message.style.textColor = textColor;
        if (fontFamily)
            message.style.fontFamily = parseInt(fontFamily, 10);
        body = body.replace(/<br\/>/g, '\n');
        var format;
        while (format = body.match(Message.tokens.FORMAT)) {
            switch (format[1]) {
                case 'b':
                    message.style.bold = true;
                    break;
                case 'i':
                    message.style.italics = true;
                    break;
                case 'u':
                    message.style.underline = true;
                    break;
            }
            body = format[2];
        }
        body = _.unescape(body);
        message.body = body;
        return message;
    };
    Message.tokens = {
        MESSAGE_PARSE: /^(?:<n(?:(?:\d{4})|((?:[a-fA-F0-9]{3}){1,2}))?\/>)?(?:<f x(\d{2})?((?:[a-fA-F0-9]{3}){1,2})?\=\"(\d+)?\">)?([\s\S]+)$/,
        FORMAT: /(?:<([biu])>)([\s\S]+?)<\/\1>/
    };
    return Message;
})();
Message.prototype.id = '';
Message.prototype.created_at = 0;
Message.prototype.body = '';
Message.prototype.user = '';
var Message;
(function (Message) {
    var Style = (function () {
        function Style() {
        }
        return Style;
    })();
    Message.Style = Style;
    Style.prototype.stylesOn = false;
    Style.prototype.fontFamily = 0;
    Style.prototype.fontSize = 11;
    Style.prototype.usebackground = 0;
    Style.prototype.textColor = '000000';
    Style.prototype.nameColor = '000000';
    Style.prototype.bold = false;
    Style.prototype.italics = false;
    Style.prototype.underline = false;
    var Background = (function () {
        function Background(args) {
            if (args !== void 0) {
                this.align = args.bgi.$.align;
                this.ialp = parseInt(args.bgi.$.ialp, 10);
                this.tile = parseInt(args.bgi.$.tile, 10);
                this.bgalp = parseInt(args.bgi.$.bgalp, 10);
                this.bgc = args.bgi.$.bgc;
                this.useimg = parseInt(args.bgi.$.useimg, 10);
                this.hasrec = parseInt(args.bgi.$.hasrec, 10);
                this.isvid = parseInt(args.bgi.$.isvid, 10);
            }
        }
        return Background;
    })();
    Message.Background = Background;
    Background.prototype.align = 'tl';
    Background.prototype.ialp = 100;
    Background.prototype.tile = 0;
    Background.prototype.bgalp = 100;
    Background.prototype.bgc = '';
    Background.prototype.useimg = 0;
    Background.prototype.hasrec = 0;
    Background.prototype.isvid = 0;
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
    })(Message.Font || (Message.Font = {}));
    var Font = Message.Font;
    var Cache = (function () {
        function Cache(options) {
            this.map = {};
            this._pending = {};
            this._cache = [];
            this._dict = {};
            _.extend(this, options);
        }
        Cache.prototype.toString = function () {
            return this._cache.toString();
        };
        Cache.prototype._push = function (message, new_id) {
            delete this._pending[message.id];
            message.id = new_id;
            this._dict[new_id] = message;
            this._cache.push(message);
            if (this._cache.length > this.size) {
                var old = this._cache.shift();
                delete this._dict[old.id];
            }
        };
        Cache.prototype.get = function (id) {
            return this._dict[id];
        };
        Cache.prototype.submit = function (message) {
            var new_id = this._pending[message.id];
            if (new_id === void 0) {
                this._pending[message.id] = message;
                return void 0;
            }
            this._push(message, new_id);
            return message;
        };
        Cache.prototype.publish = function (id, new_id) {
            var message = this._pending[id];
            if (message === void 0) {
                this._pending[id] = new_id;
                return void 0;
            }
            this._push(message, new_id);
            return message;
        };
        Cache.prototype.remove = function (id) {
            var message = this._dict[id];
            if (message === void 0) {
                return void 0;
            }
            delete this._dict[id];
            this._cache.splice(this._cache.indexOf(message), 1);
            return message;
        };
        return Cache;
    })();
    Message.Cache = Cache;
    Cache.prototype.size = 100;
})(Message || (Message = {}));
module.exports = Message;
