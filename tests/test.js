/// <reference path="../typings/mocha.d.ts"/>
/// <reference path="../dist/Connection.d.ts"/>

var should = require('should');
var winston = require('winston');
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

describe('User', function () {
  var User = require('../dist/User');
  it('correct endpoint url', function () {
    var user = new User('ttttestuser', 'asdf1234');
    user.endpoint_url.should.equal('http://ust.chatango.com/profileimg/t/t/ttttestuser');
  });
  it('get background style', function (done) {
    var user = new User('ttttestuser', 'asdf1234');
    user.getBackground().then(function (style) {
      style.should.eql({
        align: 'tl',
        ialp: 100,
        tile: 1,
        bgalp: 20,
        bgc: 'FFFFFF',
        useimg: 1,
        hasrec: 0,
        isvid: 0
      });
      done();
    });
  });
  it('get message style', function (done) {
    var user = new User('ttttestuser', 'asdf1234');
    user.getStyle().then(function (style) {
      user.style.should.eql(style);
      style.should.eql({
        name: '000000',
        font: {
          color: '',
          size: 11,
          face: 'Arial',
          bold: false,
          italics: false,
          underline: false
        },
        background: {
          align: 'tl',
          ialp: 100,
          tile: 1,
          bgalp: 100,
          bgc: '',
          useimg: 0,
          hasrec: 0,
          isvid: 0
        }
      });
      done();
    });
  });
});

describe('Room', function () {
  var Room = require('../dist/Room');
  var User = require('../dist/User');

  it('#join', function (done) {
    var room = new Room('ttttest', new User);
    room
      .join()
      .then(function () {
        return room.leave();
      })
      .then(function () {
        done()
      });
  });

//  it('#authenticate', function (done) {
//    winston.level = 'silly';
//    var room = new Room('1635132', new User('ttttestuser', 'asdf1234'))
//    room
//      .join()
//      .then(function () {
//        
//      })
//      .then(function () {
//        return room.leave();
//      })
//      .then(function () {
//        done();
//      });
//  });
});