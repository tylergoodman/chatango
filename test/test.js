/// <reference path="../typings/tsd.d.ts" />

var fs = require('fs');
var _ = require('lodash');
var should = require('should');
var faker = require('faker');

require('winston').level = 'debug';

var Chatango = require('..');
var Connection = Chatango.Connection;
var User = Chatango.User;
var Message = Chatango.Message;
var Room = Chatango.Room;

// describe('Connection', function () {

//   it('#connect', function (done) {
//     var conn = new Connection('s30.chatango.com');
//     conn
//       .connect()
//       .then(function () {
//         conn.send('v\0');
//       });
//     conn.on('data', function (data) {
//       conn.disconnect();
//     });
//     conn.on('close', function () {
//       done();
//     });
//   });
// });


// describe('User', function () {

//   it('correct endpoint url', function () {
//     var user = new User('ttttestuser');
//     user.ENDPOINT.should.equal('http://ust.chatango.com/profileimg/t/t/ttttestuser');
//   });

//   it('get background style', function (done) {
//     new User('ttttestuser')
//       .getBackground()
//       .then(function (background) {
//         // console.log(background);
  
//         background.align.should.be.String.with.length(2).and.match(/^(tl|tr|bl|br)$/);
//         background.ialp.should.be.Number.within(0, 100);
//         background.tile.should.be.Number.within(0, 1);
//         background.bgalp.should.be.Number.within(0, 100);
//         background.bgc.should.be.String.and.match(/^(.{0}|[0-9a-fA-F]{6})$/);
//         background.useimg.should.be.Number.within(0, 1);
//         background.hasrec.should.be.Number.within(0, 1);
//         background.isvid.should.be.Number.within(0, 1);
  
//         done();
//       })
//       .catch(done);
//   });

//   it('get message style', function (done) {
//     new User('ttttestuser')
//       .getStyle()
//       .then(function (style) {
//         // console.log(style);
  
//         style.nameColor.should.be.String.and.match(/^(.{0}|[0-9a-fA-F]{6})$/);
//         style.textColor.should.be.String.and.match(/^(.{0}|[0-9a-fA-F]{6})$/);
//         style.fontSize.should.be.Number.within(9, 22);
//         style.fontFamily.should.be.String;
//         // font should be one of the enumerated fonts
//         Message.Font.should.containEql(style.fontFamily);
//         style.bold.should.be.Boolean;
//         style.italics.should.be.Boolean;
//         style.underline.should.be.Boolean;
  
//         done();
//       })
//       .catch(done);
//   });

//   it('authenticate', function (done) {
//     var user = new User('ttttestuser', 'asdf1234');
//     user.authenticate().then(function () {
//       var cookies = user._cookies.getCookies('http://st.chatango.com');
//       cookies.should.be.Array.with.length(4);
//       cookies[2].should.containDeep({
//         key: 'auth.chatango.com'
//       });
//       done();
//     })
//     .catch(done);
//   });

//   it('set background', function (done) {
//     var user = new User('ttttestuser', 'asdf1234');
//     var new_bgc = hexColor();
//     user
//       .init()
//       .then(function () {
//         return user.setBackground({
//           bgc: new_bgc
//         });
//       })
//       .then(function (background) {
//         user.background.should.containEql(background);
//         background.should.have.property('bgc', new_bgc);
//         done();
//       })
//       .catch(done);
//   });

//   it('set background image', function (done) {
//     var user = new User('ttttestuser', 'asdf1234');
//     var file = fs.createReadStream('./test/Cute_Red_Panda_1152x2048.jpg');
//     user
//       .init()
//       .then(function () {
//         return user.setBackgroundImage(file);
//       })
//       .then(function () {
//         done();
//       })
//       .catch(done);
//   });

//   it('set style', function (done) {
//     var user = new User('ttttestuser', 'asdf1234');
//     var new_name_color = hexColor();
//     user
//       .init()
//       .then(function () {
//         return user.setStyle({
//           nameColor: new_name_color
//         });
//       })
//       .then(function (style) {
//         user.style.should.containEql(style);
//         style.should.have.property('nameColor', new_name_color);
//         done();
//       })
//       .catch(done);
//   });
//   it('anon names', function () {
//     User.parseAnonName('<n3953/>asd', '14396270')
//       .should.equal('anon9123');
//   });
// });


// describe('Message', function () {

//   it('style defaults', function () {
//     (new Message.Style).should.have.properties({
//       stylesOn: false,
//       fontFamily: 0,
//       fontSize: 11,
//       usebackground: 0,
//       textColor: '000000',
//       nameColor: '000000',
//       bold: false,
//       italics: false,
//       underline: false,
//     });
//   });

//   it('background defaults', function () {
//     (new Message.Background).should.have.properties({
//       align: 'tl',
//       ialp: 100,
//       tile: 0,
//       bgalp: 100,
//       bgc: '',
//       useimg: 0,
//       hasrec: 0,
//       isvid: 0,
//     });
//   });

//   it('parse', function () {
//     Message.parse('te<br/>st').should.have.property('body', 'te\nst');
//     Message.parse('<n3c0/><f x09927b62="3">&amp; test #2')
//       .should.eql({
//         'body': '& test #2',
//         'style': {
//           'nameColor': '3c0',
//           'fontSize': 9,
//           'textColor': '927b62',
//           'fontFamily': 3,
//         }
//       });
//     Message.parse('<na0a0a0/>no hope<br/>')
//       .should.eql({
//         'body': 'no hope\n',
//         'style': {
//           'nameColor': 'a0a0a0',
//         }
//       });
//     Message.parse('<u><i><b>asdf</b></i></u>')
//       .should.eql({
//         'body': 'asdf',
//         'style': {
//           'bold': true,
//           'italics': true,
//           'underline': true,
//         }
//       });
//   });
// });

describe('Room', function () {

  // describe('connect', function () {
  //   function test (room, done) {
  //     room
  //       .connect()
  //       .then(function () {
  //         return room.disconnect();
  //       })
  //       .then(function () {
  //         done();
  //       })
  //       .catch(done);
  //   }

  //   it('registered', function (done) {
  //     test(new Room('ttttest', new User('ttttestuser', 'asdf1234')), done);
  //   });

  //   it('temp', function (done) {
  //     test(new Room('ttttest', 'tempname1234'), done);
  //   });

  //   it('anon', function (done) {
  //     test(new Room('ttttest'), done);
  //   });
  // });

  describe('message', function () {
    function test (room, done) {
      var body = faker.hacker.phrase();
      room
        .connect()
        .then(function () {
          room.message(body);
        })
        .then(function () {
          return new Promise(function (resolve, reject) {
            room.on('message', function (message) {
              message.should.have.properties({
                'room': room,
                'user': room.user,
                'body': body,
              });
              resolve();
            });
          });
        })
        .timeout(750)
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

    // it('temp', function (done) {
    //   test(new Room('ttttest', 'tempname1234'), done);
    // });

    // it('anon', function (done) {
    //   test(new Room('ttttest'), done);
    // });
  });
});

// describe('top-level class creator functions', function () {
//   it('joinRoom', function (done) {
//     var room = Chatango.joinRoom('ttttest', 'ttttestuser', 'asdf1234');
//     room.should.be.instanceof(Room);
//     room.should.have.property('name', 'ttttest');
//     room.should.have.property('user');
//     room.user.should.be.instanceof(User);
//     room.user.should.have.properties({
//       username: 'ttttestuser',
//       password: 'asdf1234'
//     });
//     room.on('join', function (room) {
//       room.leave()
//         .then(function () {
//           done();
//         })
//         .catch(done);
//     });
//   });
// });

function hexColor() {
  return _.chain(_.times(6, _.partial(_.random, 65, 70, false))).map(function (n) { return String.fromCharCode(n); }).join('').value();
}

function wait(milliseconds) {
  return new Promise(function (resolve, reject) {
    setTimeout(resolve, milliseconds);
  });
}