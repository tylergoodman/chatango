/// <reference path="../typings/lodash/lodash.d.ts" />
var _ = require('lodash');
var Message;
(function (Message_1) {
    var Message = (function () {
        function Message() {
            this.style = new Style;
        }
        return Message;
    })();
    Message_1.Message = Message;
    var Style = (function () {
        function Style() {
        }
        return Style;
    })();
    Message_1.Style = Style;
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
        function Background() {
        }
        return Background;
    })();
    Message_1.Background = Background;
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
    })(Message_1.Font || (Message_1.Font = {}));
    var Font = Message_1.Font;
    Message_1.tokens = {
        MESSAGE_PARSE: /^(?:<n(?:(?:\d{4})|((?:[a-fA-F0-9]{3}){1,2}))?\/>)?(?:<f x(\d{2})?((?:[a-fA-F0-9]{3}){1,2})?\=\"(\d+)?\">)?(.+)$/,
        FORMAT: /(?:<([biu])>)(.+?)<\/\1>/
    };
    function parse(raw) {
        var ret = new Message;
        var _a = raw.match(Message_1.tokens.MESSAGE_PARSE), input = _a[0], nameColor = _a[1], fontSize = _a[2], textColor = _a[3], fontFamily = _a[4], body = _a[5];
        if (nameColor)
            ret.style.nameColor = nameColor;
        if (fontSize)
            ret.style.fontSize = parseInt(fontSize, 10);
        if (textColor)
            ret.style.textColor = textColor;
        if (fontFamily)
            ret.style.fontFamily = parseInt(fontFamily, 10);
        body = body.replace(/<br\/>/g, '\n');
        var format;
        while (format = body.match(Message_1.tokens.FORMAT)) {
            switch (format[1]) {
                case 'b':
                    ret.style.bold = true;
                    break;
                case 'i':
                    ret.style.italics = true;
                    break;
                case 'u':
                    ret.style.underline = true;
                    break;
            }
            body = format[2];
        }
        body = _.unescape(body);
        ret.body = body;
        return ret;
    }
    Message_1.parse = parse;
})(Message || (Message = {}));
module.exports = Message;
