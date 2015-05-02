/// <reference path="../typings/mocha.d.ts"/>
/// <reference path="../dist/Connection.d.ts"/>

var should = require('should');
var winston = require('winston');
winston.level = 'silly';
winston.cli();

var Connection = require('../dist/Connection');

describe('Connection', function () {
  it('#connect', function (done) {
    var conn = new Connection('s30.chatango.com');
    conn
      .connect()
      .then(function () {
        conn.send('v\0');
      })
    conn.on('data', function (data) {
      conn.disconnect();
      done();
    });
  });
});