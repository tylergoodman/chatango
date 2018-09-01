"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const User_1 = require("../../User");
const expectStyle = (style) => {
    style.nameColor.should.be.a.String().and.match(/^(.{0}|[0-9a-fA-F]{6})$/);
    style.textColor.should.be.a.String().and.match(/^(.{0}|[0-9a-fA-F]{6})$/);
    style.fontSize.should.be.a.Number().within(9, 22);
    style.fontFamily.should.be.a.Number().within(0, 8);
    style.fontFamily.should.be.oneOf(...Object.values(User_1.UserSettings.Style.Font));
    style.bold.should.be.Boolean();
    style.italics.should.be.Boolean();
    style.underline.should.be.Boolean();
};
exports.default = expectStyle;
