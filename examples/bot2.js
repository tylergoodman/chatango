#! node

// var Chatango = require('..'); // VS Code can't find definitions if you do this :(
var Chatango = require('../dist/index');
var faker = require('faker');
var winston = require('winston');
winston.level = 'debug';

var room = Chatango.joinRoom('streamerrant', 'ttttestuser', 'asdf1234');
var user = room.user;

room.on('message', function (message) {
  if (message.body.indexOf(user.name) !== -1) {
    room.message('hi!');
  }
});
