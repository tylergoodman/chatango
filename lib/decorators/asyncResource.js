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
const asyncResource = (opts) => (target, propertyKey) => {
    let fetch;
    let lifetime;
    let fetched_at = -Infinity;
    let value = this[propertyKey];
    if (typeof opts === 'function') {
        fetch = opts;
    }
    else {
        ({ fetch, lifetime } = opts);
    }
    if (lifetime === undefined) {
        lifetime = -Infinity;
    }
    Object.defineProperty(target, propertyKey, {
        get() {
            return __awaiter(this, void 0, void 0, function* () {
                if (Date.now() - fetched_at > lifetime) {
                    value = yield fetch.call(this);
                    fetched_at = Date.now();
                }
                return value;
            });
        },
        set(value) {
            return value = value;
        }
    });
};
exports.default = asyncResource;
