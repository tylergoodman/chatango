require('dotenv').config();
var fs = require('fs');
var _ = require('lodash');
var should = require('should');
var faker = require('faker');
var Promise = require('bluebird');
var debug = require('debug')('chatango:test');

var Chatango = require('..');
var User = Chatango.User;
var Message = Chatango.Message;
var Room = Chatango.Room;

var USERNAME = process.env.TEST_USERNAME;
var PASSWORD = process.env.TEST_PASSWORD;
var ROOM = process.env.TEST_ROOM;

if (!USERNAME || !PASSWORD || !ROOM) {
  throw new Error('tests require a test USERNAME/PASSWORD and ROOM they own to function. Specify them with environment variables');
}
debug('using %s / %s in room %s', USERNAME, PASSWORD, ROOM);

describe('User', function () {

  it('get message style', function (done) {
    new User(USERNAME).getStyle()
      .then(function (style) {
        // debug(style);
        style.nameColor.should.be.a.String().and.match(/^(.{0}|[0-9a-fA-F]{6})$/);
        style.textColor.should.be.a.String().and.match(/^(.{0}|[0-9a-fA-F]{6})$/);
        style.fontSize.should.be.a.Number().within(9, 22);
        style.fontFamily.should.be.a.Number().within(0, 8);
        // font should be one of the enumerated fonts
        Chatango.Font.should.containEql(style.fontFamily);
        style.bold.should.be.Boolean();
        style.italics.should.be.Boolean();
        style.underline.should.be.Boolean();
        done();
      })
      .catch(done);
  });

  it('get background style', function (done) {
    new User(USERNAME).getBackground()
      .then(function (background) {
        // debug(background);
        background.align.should.be.a.String().and.have.length(2).and.match(/^(tl|tr|bl|br)$/);
        background.ialp.should.be.a.Number().within(0, 100);
        background.tile.should.be.a.Number().within(0, 1);
        background.bgalp.should.be.a.Number().within(0, 100);
        background.bgc.should.be.a.String().and.match(/^(.{0}|[0-9a-fA-F]{6})$/);
        background.useimg.should.be.a.Number().within(0, 1);
        background.hasrec.should.be.a.Number().within(0, 1);
        background.isvid.should.be.a.Number().within(0, 1);
        done();
      })
      .catch(done);
  });

  it('authorize', function (done) {
    var user = new User(USERNAME, PASSWORD);
    // happens automatically now
    user._inited
      .then(function () {
        var cookies = user._cookies.getCookies('http://st.chatango.com');
        // debug(cookies);
        var KEY_NAMES = ['id.chatango.com', 'auth.chatango.com', 'cookies_enabled.chatango.com'];
        cookies.should.be.Array().with.length(3);
        cookies[0].key.should.equalOneOf(KEY_NAMES);
        cookies[1].key.should.equalOneOf(KEY_NAMES);
        cookies[2].key.should.equalOneOf(KEY_NAMES);
        done();
      })
      .catch(done);
  });

  it('set style', function (done) {
    var user = new User(USERNAME, PASSWORD);
    var new_name_color = hexColor();
    user.setStyle({
      nameColor: new_name_color,
    })
      .then(() => {
        user.style.nameColor.should.equal(new_name_color);
        done();
      })
      .catch(done);
  });

  it('save style', function (done) {
    var user = new User(USERNAME, PASSWORD);
    var new_name_color = hexColor();
    user.saveStyle({
      nameColor: new_name_color
    })
      .then(function (style) {
        user.style.should.containEql(style);
        user.style.should.have.property('nameColor', new_name_color);
        done();
      })
      .catch(done);
  });

  it('set background', function (done) {
    var user = new User(USERNAME, PASSWORD);
    var new_bgc = hexColor();
    user.setBackground({
      bgc: new_bgc
    })
      .then(() => {
        user.background.bgc.should.equal(new_bgc);
        done();
      })
      .catch(done);
  });

  it('save background', function (done) {
    var user = new User(USERNAME, PASSWORD);
    var new_bgc = hexColor();
    user.saveBackground({
      bgc: new_bgc
    })
      .then(function (background) {
        user.background.should.containEql(background);
        user.background.should.have.property('bgc', new_bgc);
        done();
      })
      .catch(done);
  });

  it('save background image', function (done) {
    var user = new User(USERNAME, PASSWORD);
    var file = fs.createReadStream('./test/Cute_Red_Panda_1152x2048.jpg');
    user.saveBackgroundImage(file)
      .then(function () {
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
    (new Chatango.Style).should.have.properties({
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
    (new Chatango.Background).should.have.properties({
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
    Message.parse('<u><i><b>asdf\n</b></i></u>')
      .should.eql({
        'body': 'asdf\n',
        'style': {
          'bold': true,
          'italics': true,
          'underline': true,
        }
      });
  });
});

describe('Room', function () {

  describe('connect and disconnect', function () {
    function test (room, done) {
      room.connect()
        .then(function () {
          return room.disconnect();
        })
        .then(function () {
          done();
        })
        .catch(done);
    }

    it('registered', function (done) {
      test(new Room(ROOM, new User(USERNAME, PASSWORD)), done);
    });
    it('temp', function (done) {
      test(new Room(ROOM, new User('tempname1234')), done);
    });
    it('anon', function (done) {
      test(new Room(ROOM), done);
    });
  });

  describe('message', function () {
    function test (room, done) {
      var body = faker.hacker.phrase();
      room.connect()
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
      test(new Room(ROOM, new User(USERNAME, PASSWORD)), done);
    });

    it('temp', function (done) {
      test(new Room(ROOM, new User('tempname1234')), done);
    });

    it('anon', function (done) {
      test(new Room(ROOM), done);
    });
  });

  describe('delete', function () {
    it('works', function (done) {
      var anon = new Room(ROOM);
      var moderator = new Room(ROOM, new User(USERNAME, PASSWORD));
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
  });

  describe('deleteAll', function () {
    it('by Message', function (done) {
      var user = new User(USERNAME, PASSWORD)
      var registered = new Room(ROOM, user);
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
      var user = new User(USERNAME, PASSWORD)
      var registered = new Room(ROOM, user);
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
            registered.deleteAll(user);
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
      var moderator = new Room(ROOM, new User(USERNAME, PASSWORD));
      var anon = new Room(ROOM);
      var banned_user;
      moderator.connect()
        // .delay(7000) // starting to hit message rate limiting doing these tests...
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
            banned_user = message.user;
            moderator.ban(message);
          });
        })
        .timeout(5000, 'timed out waiting for a ban command from the room')
        .then(function (ban_info) {
          ban_info.id.should.be.a.String();
          ban_info.ip.should.be.a.String();
          ban_info.name.should.be.a.String().with.length(8);
          return new Promise(function (resolve, reject) {
            moderator.once('unban', resolve);
            moderator.unban(banned_user);
          });
        })
        .then(function (unban_info) {
          unban_info.id.should.be.a.String();
          unban_info.ip.should.be.a.String();
          unban_info.name.should.be.a.String().with.length(8);
          return Promise.join(moderator.disconnect(), anon.disconnect());
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
    var room = Chatango.joinRoom(ROOM, USERNAME, PASSWORD);
    room.should.be.instanceof(Room);
    room.should.have.property('name', ROOM);
    room.should.have.property('user');
    room.user.should.be.instanceof(User);
    room.user.should.have.properties({
      name: USERNAME,
      password: PASSWORD
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
