/// <reference path="../typings/lodash/lodash.d.ts" />
var _ = require('lodash');
var Message = (function () {
    function Message() {
    }
    Message.parse = function (raw) {
        var ret = new Message;
        var _a = raw.match(Message.tokens.MESSAGE_PARSE), input = _a[0], nameColor = _a[1], fontSize = _a[2], textColor = _a[3], fontFamily = _a[4], body = _a[5];
        if (nameColor)
            ret.nameColor = nameColor;
        if (fontSize)
            ret.fontSize = parseInt(fontSize, 10);
        if (textColor)
            ret.textColor = textColor;
        if (fontFamily)
            ret.fontFamily = parseInt(fontFamily, 10);
        body = body.replace(/<br\/>/g, '\n');
        body = body.replace(/<.+?\/>/, '');
        body = _.unescape(body);
        ret.body = body;
        return ret;
    };
    Message.tokens = {
        MESSAGE_PARSE: /^(?:<n(?:(?:\d{4})|((?:[a-fA-F0-9]{3}){1,2}))?\/>)?(?:<f x(\d{2})?((?:[a-fA-F0-9]{3}){1,2})?\=\"(\d+)?\">)?(.+)$/
    };
    return Message;
})();
Message.prototype.stylesOn = false;
Message.prototype.fontFamily = 0;
Message.prototype.fontSize = 11;
Message.prototype.usebackground = 0;
Message.prototype.textColor = '';
Message.prototype.nameColor = '';
Message.prototype.bold = false;
Message.prototype.italics = false;
Message.prototype.underline = false;
var Message;
(function (Message) {
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
})(Message || (Message = {}));
module.exports = Message;
