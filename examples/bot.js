#! node

var Chatango = require('../dist/index');
var faker = require('faker');

var room = Chatango.joinRoom('ttttest', 'ttttestuser', 'asdf1234');

room.on('message', function (message) {
  console.log(message);
});

var repeats = Infinity, i = 0;
var interval = setInterval(function () {
  room.message(faker.hacker.phrase());
  if (++i > repeats) {
    clearInterval(interval);
    room.leave();
  }
}, 10000);