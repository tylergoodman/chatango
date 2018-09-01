"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
require('dotenv').config();
const expectStyle_1 = require("./helpers/expectStyle");
const expectBackground_1 = require("./helpers/expectBackground");
const User_1 = require("../User");
const { TEST_USERNAME, TEST_PASSWORD } = process.env;
describe('User', () => {
    it('getStyle', () => __awaiter(this, void 0, void 0, function* () {
        const user = new User_1.default(TEST_USERNAME);
        const style = yield user.getStyle();
        expectStyle_1.default(style);
    }));
    it('static getStyle', () => __awaiter(this, void 0, void 0, function* () {
        const style = yield User_1.default.getStyle(TEST_USERNAME);
        expectStyle_1.default(style);
    }));
    it('getBackground', () => __awaiter(this, void 0, void 0, function* () {
        const user = new User_1.default(TEST_USERNAME);
        const background = yield user.getBackground();
        expectBackground_1.default(background);
    }));
    it('static getBackground', () => __awaiter(this, void 0, void 0, function* () {
        const background = yield User_1.default.getBackground(TEST_USERNAME);
        expectBackground_1.default(background);
    }));
    it.only('getToken', () => __awaiter(this, void 0, void 0, function* () {
        const token = yield User_1.default.getToken(TEST_USERNAME, TEST_PASSWORD);
        console.log(token);
    }));
});
