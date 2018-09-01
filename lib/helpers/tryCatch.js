"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function tryCatch(fn, handler) {
    try {
        fn();
    }
    catch (err) {
        handler(err);
    }
}
exports.default = tryCatch;
