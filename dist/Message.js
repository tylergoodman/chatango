var Message = (function () {
    function Message() {
    }
    return Message;
})();
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
