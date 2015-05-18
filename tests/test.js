var fs = require('fs');

var should = require('should');
var winston = require('winston');
var _ = require('lodash');

winston.cli();
winston.level = 'verbose';

//var Chatango = require('../dist');
var Chatango = {
  Connection: require('../dist/Connection'),
  User: require('../dist/User'),
  Message: require('../dist/Message'),
  Room: require('../dist/Room'),
}

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
      user.background.should.eql(background);
//      console.log(background);

      background.align.should.be.String.with.length(2).and.match(/^(tl|tr|bl|br)$/);
      background.ialp.should.be.Number.within(0, 100);
      background.tile.should.be.Number.within(0, 1);
      background.bgalp.should.be.Number.within(0, 100);
      background.bgc.should.be.String.and.match(/^|[0-9a-fA-F]{6}$/);
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

      style.nameColor.should.be.String.and.match(/^|[0-9a-fA-F]{6}$/);
      style.textColor.should.be.String.and.match(/^|[0-9a-fA-F]{6}$/);
      style.fontSize.should.be.Number.within(9, 22);
      style.fontFamily.should.be.String;
      // font should be one of the enumerated fonts
      Chatango.Message.Font.should.containEql(style.fontFamily);
      style.bold.should.be.Boolean;
      style.italics.should.be.Boolean;
      style.underline.should.be.Boolean;

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
    var new_bgc = hexColor();
    user
      .init()
      .then(function () {
        return user.setBackground({
          bgc: new_bgc
        });
      })
      .then(function (background) {
        user.background.should.containEql(background);
        background.should.have.property('bgc', new_bgc);
        done();
      })
      .catch(done);
  });
  it('set background image', function (done) {
    var user = new User('ttttestuser', 'asdf1234');
    var file = fs.createReadStream('./tests/Cute_Red_Panda_1152x2048.jpg');
    user
      .init()
      .then(function () {
        return user.setBackgroundImage(file);
      })
      .then(function () {
        done();
      })
      .catch(done);
  });
  it('set style', function (done) {
    var user = new User('ttttestuser', 'asdf1234');
    var new_name_color = hexColor();
    user
      .init()
      .then(function () {
        return user.setStyle({
          nameColor: new_name_color
        });
      })
      .then(function (style) {
        user.style.should.containEql(style);
        style.should.have.property('nameColor', new_name_color);
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

function hexColor() {
  return _.chain(_.times(6, _.partial(_.random, 65, 70, false))).map(function (n) { return String.fromCharCode(n); }).join('').value();
}

function wait(milliseconds) {
  return new Promise(function (resolve, reject) {
    setTimeout(resolve, milliseconds);
  });
}