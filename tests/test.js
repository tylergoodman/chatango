/// <reference path="../typings/bluebird/bluebird.d.ts" />
/// <reference path="../typings/mocha/mocha.d.ts" />

/// <reference path="../typings/Connection.d.ts" />
/// <reference path="../typings/Message.d.ts" />
/// <reference path="../typings/User.d.ts" />
/// <reference path="../typings/Room.d.ts" />
// TODO - these references aren't working, fix them


var should = require('should');
var winston = require('winston');
winston.cli();
winston.level = 'verbose';

var Chatango = require('../dist');

describe('Connection', function () {
  var Connection = Chatango.Connection;

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
  var User = Chatango.User;

  it('correct endpoint url', function () {
    var user = new User('ttttestuser');
    user.endpoint_url.should.equal('http://ust.chatango.com/profileimg/t/t/ttttestuser');
  });
  it('get background style', function (done) {
    var user = new User('ttttestuser');
    user.getBackground().then(function (background) {
      user.style.background.should.eql(background);
//      console.log(background);

      background.align.should.be.String.with.length(2).and.match(/^(tl|tr|bl|br)$/);
      background.ialp.should.be.Number.within(0, 100);
      background.tile.should.be.Number.within(0, 1);
      background.bgalp.should.be.Number.within(0, 100);
      background.bgc.should.be.String.with.length(6).and.match(/^[0-9a-fA-F]{6}$/);
      background.useimg.should.be.Number.within(0, 1);
      background.hasrec.should.be.Number.within(0, 1);
      background.isvid.should.be.Number.within(0, 1);

      done();
    })
    .catch(done);
  });
  it('get message style', function (done) {
    var user = new User('ttttestuser');
    user.getStyle().then(function (style) {
      user.style.should.eql(style);
//      console.log(style);

      style.name.should.be.String.and.match(/^|[0-9a-fA-F]{6}$/);
      style.font.color.should.be.String.and.match(/^|[0-9a-fA-F]{6}$/);
      style.font.size.should.be.Number.within(9, 22);
      style.font.face.should.be.String;
      // font should be one of the enumerated fonts
      Chatango.Message.Font.should.containEql(style.font.face);
      style.font.bold.should.be.Boolean;
      style.font.italics.should.be.Boolean;
      style.font.underline.should.be.Boolean;

      done();
    })
    .catch(done);
  });
  it('authenticate', function (done) {
    var user = new User('ttttestuser', 'asdf1234');
    user.authenticate().then(function () {
      var cookies = user.cookies.getCookies('http://st.chatango.com');
      cookies.should.be.Array.with.length(4);
      cookies[2].should.containDeep({
        key: 'auth.chatango.com'
      });
      done();
    })
    .catch(done);
  });
  it('set background', function (done) {
    var user = new User('ttttestuser', 'asdf1234');
    user
      .init()
      .then(function () {
        return user.setBackground({
          bgc: 'aaaaaa'
        });
      })
      .then(function () {
        return user.getBackground();
      })
      .then(function (background) {
        background.should.have.property('bgc', 'aaaaaa');
        done();
      })
      .catch(done);
  });
});

//describe('Room', function () {
//  var Room = Chatango.Room;
//  var User = Chatango.User;
//
//  it('#join', function (done) {
//    var room = new Room('ttttest', new User);
//    room
//      .join()
//      .then(function () {
//        return room.leave();
//      })
//      .then(function () {
//        done()
//      });
//  });
//
////  it('#authenticate', function (done) {
////    winston.level = 'silly';
////    var room = new Room('1635132', new User('ttttestuser', 'asdf1234'))
////    room
////      .join()
////      .then(function () {
////        
////      })
////      .then(function () {
////        return room.leave();
////      })
////      .then(function () {
////        done();
////      });
////  });
//});