/// <reference path="../typings/node/node.d.ts" />
/// <reference path="../typings/lodash/lodash.d.ts" />
/// <reference path="../typings/bluebird/bluebird.d.ts" />
/// <reference path="../typings/winston/winston.d.ts" />

import events = require('events');
import util = require('util');
import _ = require('lodash');
import Promise = require('bluebird');
import winston = require('winston');

import User = require('./User');
import Connection = require('./Connection');

class Room extends events.EventEmitter {
  name: string;
  user: User;
  users: User[];
  connection: Connection;

  buffer: string = '';
  sessionid: string = '';
  firstSend: boolean = true;
  has_init: boolean = false;

  constructor(name: string, user: User) {
    super();

    this.name = name;
    this.user = user;

    this.connection = new Connection(this.getServer());

    this.connection.on('data', this.receiveData.bind(this));

    this.connection.on('connect', () => {
      winston.log('info', `Connected to room ${this.name}`);
    });

    this.connection.on('close', () => {
      winston.log('info', `Disconnected from room ${this.name}`);
      this.buffer = '';
      this.firstSend = true;
      this.has_init = false;
      this.emit('leave');
    });
  }

  join(): Promise<void> {
    winston.log('verbose', `Connecting to room ${this.name}`);
    return this.connection
      .connect()
      .then(() => {
        return new Promise<void>((resolve, reject) => {
          this.once('init', resolve);
          this.send(`bauth:${this.name}:${this.sessionid}::`);
        })
      })
      .then(() => {
        return this.authenticate();
      });
  }

  leave(): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      winston.log('verbose', `Disconnecting from room ${this.name}`);
      this.connection.disconnect();
      this.connection.once('close', resolve);
    });
  }

  send(command: string): Room;
  send(command: string[]): Room;
  send(command: any): Room {
    if (_.isArray(command)) {
      command = command.join(':');
    }
    if (!this.firstSend) {
      command += '\r\n';
    }
    this.firstSend = false;
    command += '\0';
    winston.log('verbose', `Sending command to room ${this.name}: "${command}"`);
    this.connection.send(command);
    return this;
  }

  sendMessage(content: string): Room {
//    var message = `<n{nameColor}/><f x{fontSize}{fontColor}="{fontFace}">{contents}`;
//
//    this.send(['bm', Math.round(15E5 * Math.random()).toString(36), '0', message]);
    return this;
  }

  private authenticate(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (this.user.type === User.Type.Anonymous)
        return resolve();

      if (this.user.type === User.Type.Temporary)
        this.send(`blogin:${this.user.username}`);

      if (this.user.type === User.Type.Registered)
        this.send(`blogin:${this.user.username}:${this.user.password}`);

      this.once('join', resolve);
    });
  }

  private handleCommand(command: string, args: string[]): void {
    winston.log('verbose', `Received <${command}> command from room ${this.name}`);
    switch (command) {
      case 'inited':
        this.emit('init');
        break;
      case 'pwdok':
      case 'aliasok':
        this.emit('join');
        break;
      default:
        winston.log('warn', `Received command that has no handler from room ${this.name}: <${command}>`);
        break;
    }
  }

  private receiveData(data: string): void {
    this.buffer += data;
    var commands: string[] = this.buffer.split('\0');
    if (commands[commands.length - 1] !== '') {
      this.buffer = commands.pop();
    }
    else {
      commands.pop();
      this.buffer = '';
    }
    winston.log('silly', `Received commands from room ${this.name}: ${commands}`);
    for (var i = 0; i < commands.length; i++) {
      var [command, ...args] = commands[i].split(':');
      this.handleCommand(command, args);
    }
  }

  private getServer(room_name: string = this.name): string {
    // magic
    var tsweights: [string, number][] = [
      ['5', 75], ['6', 75], ['7', 75], ['8', 75], ['16', 75], ['17', 75], ['18', 75],
      ['9', 95], ['11', 95], ['12', 95], ['13', 95], ['14', 95], ['15', 95], ['19', 110],
      ['23', 110], ['24', 110], ['25', 110], ['26', 110], ['28', 104], ['29', 104], ['30', 104],
      ['31', 104], ['32', 104], ['33', 104], ['35', 101], ['36', 101], ['37', 101], ['38', 101],
      ['39', 101], ['40', 101], ['41', 101], ['42', 101], ['43', 101], ['44', 101], ['45', 101],
      ['46', 101], ['47', 101], ['48', 101], ['49', 101], ['50', 101], ['52', 110], ['53', 110],
      ['55', 110], ['57', 110], ['58', 110], ['59', 110], ['60', 110], ['61', 110], ['62', 110],
      ['63', 110], ['64', 110], ['65', 110], ['66', 110], ['68', 95], ['71', 116], ['72', 116],
      ['73', 116], ['74', 116], ['75', 116], ['76', 116], ['77', 116], ['78', 116], ['79', 116],
      ['80', 116], ['81', 116], ['82', 116], ['83', 116], ['84', 116]
    ];

    room_name = room_name.replace('_', 'q').replace('-', 'q');

    var fnv = parseInt(room_name.slice(0, _.min([room_name.length, 5])), 36);
    var lnv: any = room_name.slice(6, 6 + _.min([room_name.length - 5, 3]));
    if (lnv) {
      lnv = parseInt(lnv, 36);
      if (lnv < 1000)
        lnv = 1000;
    }
    else
      lnv = 1000;

    var num = (fnv % lnv) / lnv;
    var maxnum = _.sum(tsweights.map((n) => { return n[1]; }));
    var cumfreq = 0;
    for (var i = 0; i < tsweights.length; i++) {
      var weight: [string, number] = tsweights[i]; 
      cumfreq += weight[1] / maxnum;
      if (num <= cumfreq) {
        return `s${weight[0]}.chatango.com`;
      }
    }
    throw new Error(`Couldn't find host server for room name ${room_name}`);
  }
}

export = Room;