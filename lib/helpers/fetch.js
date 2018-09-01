"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fetch_1 = require("node-fetch");
const fetchIntercept = (url, opts = {}) => {
    return node_fetch_1.default(url, Object.assign({}, opts, { headers: Object.assign({ 'User-Agent': 'ChatangoJS' }, opts.headers) }));
};
exports.default = fetchIntercept;
