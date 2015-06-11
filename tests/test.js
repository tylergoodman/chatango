var fs = require('fs');
var _ = require('lodash');
var should = require('should');

require('winston').level = 'verbose';

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
      Message.Font.should.containEql(style.fontFamily);
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
  it('anon names', function () {
    User.getAnonName('<n3953/>asd', '14396270')
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

  describe('join', function () {
    function test (room, done) {
      room
        .join()
        .then(function () {
          return room.leave();
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
      test(new Room('ttttest', new User('tempname1234')), done);
    });

    it('anon', function (done) {
      test(new Room('ttttest'), done);
    });
  });

  describe('message', function () {
    // he he
    var body = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.";
    function test (room, done) {
      room
        .join()
        .then(function () {
          room.sendMessage(body);
        })
        .then(function () {
          return new Promise(function (resolve, reject) {
            room.on('message', function (name, message) {
              name.should.equal(room.user.username);
              message.should.have.property('body', body);
              resolve();
            });
          });
        })
        .timeout(750)
        .then(function () {
          return room.leave();
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
      test(new Room('ttttest', new User('tempname1234')), done);
    });

    it('anon', function (done) {
      test(new Room('ttttest'), done);
    });
  });
});

function hexColor() {
  return _.chain(_.times(6, _.partial(_.random, 65, 70, false))).map(function (n) { return String.fromCharCode(n); }).join('').value();
}

function wait(milliseconds) {
  return new Promise(function (resolve, reject) {
    setTimeout(resolve, milliseconds);
  });
}