"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parseCookieString = (cookie) => {
    const [nameValue, ...parts] = cookie.split(/;\s+?/);
    let [name, value] = nameValue.split('=');
    name = name.toLowerCase();
    value = decodeURIComponent(value);
    const partialCookie = parts.reduce((acc, part) => {
        let name;
        let value;
        ([name, value] = part.split('='));
        name = name.toLowerCase();
        if (name === 'expires') {
            value = new Date(value);
        }
        if (!value) {
            value = true;
        }
        acc[name] = value;
        return acc;
    }, {});
    return Object.assign({ name,
        value }, partialCookie);
};
const parseCookies = (headers) => {
    const ret = [];
    const cookies = headers.raw()['set-cookie'];
    if (typeof cookies === 'string') {
        const cookie = parseCookieString(cookies);
        ret.push(cookie);
    }
    else {
        cookies
            .map(parseCookieString)
            .forEach((cookie) => {
            ret.push(cookie);
        });
    }
    return ret;
};
exports.default = parseCookies;
