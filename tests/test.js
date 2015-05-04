/// <reference path="../typings/mocha.d.ts"/>
/// <reference path="../dist/Connection.d.ts"/>

var should = require('should');
var winston = require('winston');
winston.level = 'silly';
winston.cli();

describe('Connection', function () {
  var Connection = require('../dist/Connection');

  it('#connect', function (done) {
    var conn = new Connection('s30.chatango.com');
    conn
      .connect()
      .then(function () {
        conn.send('v\0');
      });
    conn.on('data', function (data) {
      conn.disconnect();
    });
    conn.on('close', function () {
      done();
    });
  });
});

describe('Room', function () {
  var Room = require('../dist/Room');
  var User = require('../dist/User');

  it('#join', function (done) {
    var user = new User;
    var room = new Room('1635132', user);
    room
      .join()
      .then(function () {
        return room.leave();
      })
      .then(function () {
        done()
      });
  });
});