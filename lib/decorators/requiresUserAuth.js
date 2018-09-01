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
const requiresUserAuth = (target, propertyKey, descriptor) => {
    if (!descriptor) {
        descriptor = Object.getOwnPropertyDescriptor(target, propertyKey);
    }
    var originalMethod = descriptor.value;
    descriptor.value = function () {
        return __awaiter(this, arguments, void 0, function* () {
            if (!this._auth) {
                yield this._getToken();
            }
            return originalMethod(...arguments);
        });
    };
};
exports.default = requiresUserAuth;
