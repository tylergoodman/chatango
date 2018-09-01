"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const xml2js = require("xml2js");
const parseXML = (xml) => {
    return new Promise((resolve, reject) => {
        try {
            xml2js.parseString(xml, (err, result) => {
                if (err) {
                    return reject(err);
                }
                resolve(result);
            });
        }
        catch (err) {
            reject(err);
        }
    });
};
exports.default = parseXML;
