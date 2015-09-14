/// <reference path="../typings/tsd.d.ts" />

var fs = require('fs');
var _ = require('lodash');
var should = require('should');
var faker = require('faker');
var Promise = require('bluebird');

require('winston').level = 'debug';

var Chatango = require('..');
var Connection = Chatango.Connection;
var User = Chatango.User;
var Message = Chatango.Message;
var Room = Chatango.Room;

describe('Connection', function () {

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

  it('correct endpoint url', function () {
    var user = new User('ttttestuser');
    user.ENDPOINT.should.equal('http://ust.chatango.com/profileimg/t/t/ttttestuser');
  });

  it('get background style', function (done) {
    new User('ttttestuser')
      .getBackground()
      .then(function (background) {
        // console.log(background);

        background.align.should.be.a.String.with.length(2).and.match(/^(tl|tr|bl|br)$/);
        background.ialp.should.be.a.Number.within(0, 100);
        background.tile.should.be.a.Number.within(0, 1);
        background.bgalp.should.be.a.Number.within(0, 100);
        background.bgc.should.be.a.String.and.match(/^(.{0}|[0-9a-fA-F]{6})$/);
        background.useimg.should.be.a.Number.within(0, 1);
        background.hasrec.should.be.a.Number.within(0, 1);
        background.isvid.should.be.a.Number.within(0, 1);

        done();
      })
      .catch(done);
  });

  it('get message style', function (done) {
    new User('ttttestuser')
      .getStyle()
      .then(function (style) {
        // console.log(style);

        style.nameColor.should.be.a.String.and.match(/^(.{0}|[0-9a-fA-F]{6})$/);
        style.textColor.should.be.a.String.and.match(/^(.{0}|[0-9a-fA-F]{6})$/);
        style.fontSize.should.be.a.Number.within(9, 22);
        style.fontFamily.should.be.a.String;
        // font should be one of the enumerated fonts
        Message.Font.should.containEql(style.fontFamily);
        style.bold.should.be.Boolean;
        style.italics.should.be.Boolean;
        style.underline.should.be.Boolean;

        done();
      })
      .catch(done);
  });

  it('authorize', function (done) {
    var user = new User('ttttestuser', 'asdf1234');
    user.authorize().then(function () {
      var cookies = user._cookies.getCookies('http://st.chatango.com');
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
    var file = fs.createReadStream('./test/Cute_Red_Panda_1152x2048.jpg');
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
  it('anon names', function () {
    User.parseAnonName('<n3953/>asd', '14396270')
      .should.equal('anon9123');
  });
});


describe('Message', function () {

  it('style defaults', function () {
    (new Message.Style).should.have.properties({
      stylesOn: false,
      fontFamily: 0,
      fontSize: 11,
      usebackground: 0,
      textColor: '000000',
      nameColor: '000000',
      bold: false,
      italics: false,
      underline: false,
    });
  });

  it('background defaults', function () {
    (new Message.Background).should.have.properties({
      align: 'tl',
      ialp: 100,
      tile: 0,
      bgalp: 100,
      bgc: '',
      useimg: 0,
      hasrec: 0,
      isvid: 0,
    });
  });

  it('parse', function () {
    Message.parse('te<br/>st').should.have.property('body', 'te\nst');
    Message.parse('<n3c0/><f x09927b62="3">&amp; test #2')
      .should.eql({
        'body': '& test #2',
        'style': {
          'nameColor': '3c0',
          'fontSize': 9,
          'textColor': '927b62',
          'fontFamily': 3,
        }
      });
    Message.parse('<na0a0a0/>no hope<br/>')
      .should.eql({
        'body': 'no hope\n',
        'style': {
          'nameColor': 'a0a0a0',
        }
      });
    Message.parse('<u><i><b>asdf</b></i></u>')
      .should.eql({
        'body': 'asdf',
        'style': {
          'bold': true,
          'italics': true,
          'underline': true,
        }
      });
  });
});

describe('Room', function () {

  describe('connect', function () {
    function test (room, done) {
      room
        .connect()
        .then(function () {
          return room.disconnect();
        })
        .then(function () {
          done();
        })
        .catch(done);
    }

    it('registered', function (done) {
      test(new Room('ttttest', new User('ttttestuser', 'asdf1234')), done);
    });

    it('temp', function (done) {
      test(new Room('ttttest', 'tempname1234'), done);
    });

    it('anon', function (done) {
      test(new Room('ttttest'), done);
    });
  });

  describe('message', function () {
    function test (room, done) {
      var body = faker.hacker.phrase();
      room
        .connect()
        .then(function () {
          return new Promise(function (resolve, reject) {
            room.once('message', resolve);
            room.message(body);
          });
        })
        .timeout(1000, 'timed out waiting for a message command from the room')
        .then(function (message) {
          message.should.have.properties({
            'room': room,
            'user': room.user,
            'body': body,
          });
          return room.disconnect();
        })
        .then(function () {
          done();
        })
        .catch(done);
    }

    it('registered', function (done) {
      test(new Room('ttttest', new User('ttttestuser', 'asdf1234')), done);
    });

    it('temp', function (done) {
      test(new Room('ttttest', 'tempname1234'), done);
    });

    it('anon', function (done) {
      test(new Room('ttttest'), done);
    });
  });

  it('delete', function (done) {
    var anon = new Room('ttttest');
    var moderator = new Room('ttttest', new User('ttttestuser', 'asdf1234'));
    var message = faker.hacker.phrase();
    moderator.connect()
      .then(function () {
        return anon.connect();
      })
      .then(function () {
        return new Promise(function (resolve, reject) {
          moderator.once('message', resolve);
          anon.message(message);
        });
      })
      .timeout(5000, 'timed out waiting to receive a message command from the room')
      .then(function (message) {
        return new Promise(function (resolve, reject) {
          moderator.once('message_delete', resolve);
          moderator.delete(message);
        });
      })
      .timeout(5000, 'timed out waiting to receive a message delete command from the room')
      .then(function (deleted_message) {
        message.should.equal(deleted_message.body);
        return anon.disconnect();
      })
      .then(function () {
        return moderator.disconnect();
      })
      .then(function () {
        done();
      })
      .catch(done);
  });

  describe('deleteAll', function () {

    it('by Message', function (done) {
      var user = new User('ttttestuser', 'asdf1234')
      var registered = new Room('ttttest', user);
      registered.connect()
        .then(function () {
          return new Promise(function (resolve, reject) {
            registered.once('message', resolve);
            registered.message(faker.hacker.phrase());
          });
        })
        .timeout(5000, 'timed out waiting to receive a message command from the room')
        .then(function (message) {
          // console.dir(message);
          return new Promise(function (resolve, reject) {
            registered.once('message_delete', resolve);
            registered.deleteAll(message);
          })
        })
        .timeout(5000, 'timed out waiting to receive a delete command from the room')
        .then(function (deleted_message) {
          return registered.disconnect();
        })
        .then(function () {
          done();
        })
        .catch(done);
    });

    it('by User', function (done) {
      var user = new User('ttttestuser', 'asdf1234')
      var registered = new Room('ttttest', user);
      registered.connect()
        .then(function () {
          return new Promise(function (resolve, reject) {
            registered.once('message', resolve);
            registered.message(faker.hacker.phrase());
          });
        })
        .timeout(5000, 'timed out waiting for a message command from the room')
        .then(function (message) {
          return new Promise(function (resolve, reject) {
            registered.once('message_delete', resolve);
            registered.deleteAll(message.user_id);
          })
        })
        .timeout(5000, 'timed out waiting for a delete command from the room')
        .then(function (deleted_message) {
          return registered.disconnect();
        })
        .then(function () {
          done();
        })
        .catch(done);
    });

  });

  describe('ban and unban', function () {
    it('anonymous', function (done) {
      var moderator = new Room('ttttest', new User('ttttestuser', 'asdf1234'));
      var anon = new Room('ttttest');
      moderator.connect()
        .delay(7000) // starting to hit message rate limiting doing these tests...
        .then(function () {
          return anon.connect();
        })
        .then(function () {
          return new Promise(function (resolve, reject) {
            moderator.once('message', resolve);
            anon.message(faker.hacker.phrase());
          });
        })
        .timeout(5000, 'timed out waiting for a message command from the room')
        .then(function (message) {
          return new Promise(function (resolve, reject) {
            moderator.once('ban', resolve);
            moderator.ban(message);
          });
        })
        .timeout(5000, 'timed out waiting for a ban command from the room')
        .then(function (ban_info) {
          ban_info.id.should.be.a.String;
          ban_info.ip.should.be.a.String;
          ban_info.name.should.be.a.String.with.length(0);
          return moderator.disconnect().join(anon.disconnect());
        })
        .then(function () {
          done();
        })
        .catch(done);
    });
  });

});


describe('top-level class creator functions', function () {
  it('joinRoom', function (done) {
    var room = Chatango.joinRoom('ttttest', 'ttttestuser', 'asdf1234');
    room.should.be.instanceof(Room);
    room.should.have.property('name', 'ttttest');
    room.should.have.property('user');
    room.user.should.be.instanceof(User);
    room.user.should.have.properties({
      name: 'ttttestuser',
      password: 'asdf1234'
    });
    room.on('connect', function (room) {
      room.disconnect()
        .then(function () {
          done();
        })
        .catch(done);
    });
  });
});

function hexColor() {
  return _.chain(_.times(6, _.partial(_.random, 65, 70, false))).map(function (n) { return String.fromCharCode(n); }).join('').value();
}

// use .delay(TIME_MS)
// function wait(milliseconds) {
//   return new Promise(function (resolve, reject) {
//     setTimeout(resolve, milliseconds);
//   });
// }
