#! node

var Chatango = require('..');
var faker = require('faker');

var room = Chatango.joinRoom('ttttest', 'ttttestuser', 'asdf1234');
var user = room.user;

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