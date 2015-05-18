/// <reference path="../typings/node/node.d.ts" />
/// <reference path="../typings/request/request.d.ts" />
/// <reference path="../typings/xml2js/xml2js.d.ts" />
/// <reference path="../typings/bluebird/bluebird.d.ts" />
/// <reference path="../typings/winston/winston.d.ts" />
/// <reference path="../typings/lodash/lodash.d.ts" />

import fs = require('fs');
import request = require('request');
import xml2js = require('xml2js');
import Promise = require('bluebird');
import winston = require('winston');
import _ = require('lodash');

import Message = require('./Message');

class User {
  username: string = '';
  password: string = '';
  type: User.Type;

  style: Message.Style = {};
  background: Message.Background = {};

  cookies: request.CookieJar = request.jar();

  static endpoint: string = 'http://ust.chatango.com/profileimg';
//  static enum Type {
//    Anonymous,
//    Temporary,
//    Registered,
//  }

  get endpoint_url(): string {
    return `${User.endpoint}/${this.username.charAt(0)}/${this.username.charAt(1)}/${this.username}`;
  }

  constructor(username: string = '', password: string = '') {
    this.username = username;
    this.password = password;

//    this.cookies.setCookie(request.cookie('cookies_enabled.chatango.com=yes'), 'http://.chatango.com');
//    this.cookies.setCookie(request.cookie('fph.chatango.com=http'), 'http://.chatango.com');

    if (!username && !password) {
      this.type = User.Type.Anonymous;
    }
    else if (!password) {
      this.type = User.Type.Temporary;
    }
    else {
      this.type = User.Type.Registered;
    }

//    this.init();
  }

  init(): Promise<any> {
    return this.authenticate()
      .then(() => {
        return this.getStyle();
      })
      .then(() => {
        return this.getBackground();
      });
  }

  authenticate(): Promise<void> {
    winston.log('silly', `Authenticating user ${this.username}`);
    return new Promise<void>((resolve, reject) => {
      request({
        url: 'http://scripts.st.chatango.com/setcookies',
        method: 'POST',
        jar: this.cookies,
        form: {
          pwd: this.password,
          sid: this.username
        },
        headers: {
          'User-Agent': 'ChatangoJS'
        }
      }, (error, response, body) => {
        if (error) {
          winston.log('error', `Error while authenticating user ${this.username}: ${error}`);
          return reject(error);
        }
        winston.log('info', `Authentication successful: ${this.username}`);
        resolve();
      });
//      request({
//        url: 'http://chatango.com/login',
//        method: 'POST',
//        jar: this.cookies,
//        form: {
//          "user_id": this.username,
//          "password": this.password,
//          "storecookie": "on",
//          "checkerrors": "yes"
//        },
//        headers: {
//          'User-Agent': 'ChatangoJS'
//        }
//      }, (error, response, body) => {
//        if (error) {
//          winston.log('error', `Error while authenticating user ${this.username}: ${error}`);
//          return reject(error);
//        }
//        winston.log('info', `Authentication successful: ${this.username}`);
//        resolve();
//      });
    });
  }

  getStyle(): Promise<Message.Style> {
    winston.log('silly', `Getting style for user ${this.username}`);
    return new Promise<Message.Style>((resolve, reject) => {
      request(`${this.endpoint_url}/msgstyles.json`, (error, response, body) => {
        if (error) {
          winston.log('error', `Error while retrieving style for user ${this.username}`);
          return reject(error);
        }
        if (response.statusCode !== 200) {
          winston.log('error', `Error while retrieving style for user ${this.username}: ${response.statusMessage}`);
          return reject(new Error(`${response.statusCode}: ${response.statusMessage}`));
        }
        winston.log('verbose', `Retrieved style for user ${this.username}`);
        this.style = JSON.parse(body);
        this.style.fontSize = Number(this.style.fontSize);
        this.style.usebackground = Number(this.style.usebackground);
        resolve(this.style);
      });
    })
  }

  static getStyle(username: string): Promise<Message.Style> {
    return this.prototype.getStyle.call({ username: username });
  }

  setStyle(style: Message.Style = {}): Promise<Message.Style> {
    winston.log('silly', `Saving style for user ${this.username}`);
    style = _.extend(this.style, style);

    var data = _.transform(style, (result, value, key) => {
      result[key] = String(value);
    });

    return new Promise<Message.Style>((resolve, reject) => {
      request({
        url: 'http://chatango.com/updatemsgstyles',
        method: 'POST',
        jar: this.cookies,
        formData: _.extend({
          'lo': this.username,
          'p': this.password,
        }, data),
        headers: {
          'User-Agent': 'ChatangoJS',
        }
      }, (error, response, body) => {
        if (error) {
          winston.log('error', `Error while saving style for user ${this.username}: ${error}`);
          return reject(error);
        }
        if (response.statusCode !== 200) {
          winston.log('error', `Error while saving style for user ${this.username}: ${response.statusMessage}`);
          return reject(new Error(`${response.statusCode}: ${response.statusMessage}`));
        }
        winston.log('verbose', `Saved style for user ${this.username}`);
        this.style = style;
        resolve(style);
      });
    });
  }

  getBackground(): Promise<Message.Background> {
    winston.log('silly', `Getting background for user ${this.username}`);
    return new Promise<any>((resolve, reject) => {
      request(`${this.endpoint_url}/msgbg.xml`, (error, response, body) => {
        if (error) {
          winston.log('error', `Error while retrieving background for user ${this.username}`);
          return reject(error);
        }
        if (response.statusCode !== 200) {
          winston.log('error', `Error while retrieving background for user ${this.username}: ${response.statusMessage}`);
          return reject(new Error(`${response.statusCode}: ${response.statusMessage}`));
        }
        winston.log('silly', `Retrieved background for user ${this.username}`);
        resolve(response.toJSON());
      });
    })
    .then((response) => {
      winston.log('silly', `Parsing background for ${this.username}`);
      return new Promise<Message.Background>((resolve, reject) => {
        if (response.headers['content-type'] === 'image/jpeg') {
          winston.log('warn', `User ${this.username} has no background data. Using default.`);
          this.background = {
            'align': 'tl',
            'ialp': 100,
            'tile': 1,
            'bgalp': 100,
            'bgc': '',
            'useimg': 0,
            'hasrec': 0,
            'isvid': 0,
          };
          return resolve(this.background);
        }
        xml2js.parseString(response.body, (err, result) => {
          if (err) {
            winston.log('error', `Error while parsing background for user ${this.username}`);
            return reject(err);
          }
          winston.log('verbose', `Retrieved background for user ${this.username}`);
          this.background = {
            'align': result.bgi.$.align,
            'ialp': Number(result.bgi.$.ialp),
            'tile': Number(result.bgi.$.tile),
            'bgalp': Number(result.bgi.$.bgalp),
            'bgc': result.bgi.$.bgc,
            'useimg': Number(result.bgi.$.useimg),
            'hasrec': Number(result.bgi.$.hasrec),
            'isvid': Number(result.bgi.$.isvid),
          };
          resolve(this.background);
        });
      });
    });
  }

  static getBackground(username: string): Promise<Message.Background> {
    return this.prototype.getBackground.call({ username: username });
  }

  setBackground(background: Message.Background = {}): Promise<Message.Background> {
    winston.log('silly', `Saving background for user ${this.username}`);
    background = _.extend(this.background, background);

    return new Promise<Message.Background>((resolve, reject) => {
      request({
        url: 'http://chatango.com/updatemsgbg',
        method: 'POST',
        jar: this.cookies,
        form: _.extend(background, {
          'lo': this.username,
          'p': this.password
        }),
        headers: {
          'User-Agent': 'ChatangoJS'
        }
      }, (error, response, body) => {
        if (error) {
          winston.log('error', `Error while saving background for user ${this.username}: ${error}`);
          return reject(error);
        }
        if (response.statusCode !== 200) {
          winston.log('error', `Error while saving background for user ${this.username}: ${response.statusMessage}`);
          return reject(new Error(`${response.statusCode}: ${response.statusMessage}`));
        }
        winston.log('verbose', `Saved background for user ${this.username}`);
        this.background = background;
        resolve(background);
      });
    });
  }

  setBackgroundImage(stream: fs.ReadStream): Promise<void> {
    winston.log('silly', `Saving background image for user ${this.username}`);
    return new Promise<void>((resolve, reject) => {
      request({
        url: 'http://chatango.com/updatemsgbg',
        method: 'POST',
        jar: this.cookies,
        headers: {
          'User-Agent': 'ChatangoJS'
        },
        formData: {
          'lo': this.username,
          'p': this.password,
          'Filedata': stream
        }
      }, (error, response, body) => {
        if (error) {
          winston.log('error', `Error while saving background image for user ${this.username}: ${error}`);
          return reject(error);
        }
        if (response.statusCode !== 200) {
          winston.log('error', `Error while saving background for user ${this.username}: ${response.statusMessage}\nAre you authenticated?`);
          return reject(new Error(`${response.statusCode}: ${response.statusMessage}`));
        }
        winston.log('verbose', `Set background image for user ${this.username}`);
        resolve();
      });
    });
  }

  getBackgroundImage(): request.Request {
    return request(`${this.endpoint_url}/msgbg.jpg`);
  }
  static getBackgroundImage(username: string): request.Request {
    return this.prototype.getBackgroundImage.call({ username: username });
  }

  getAvatar(): request.Request {
    return request(`${this.endpoint_url}/thumb.jpg`);
  }
  static getAvatar(username: string): request.Request {
    return this.prototype.getAvatar.call({ username: username });
  }

}

// typescript pls
module User {
  export enum Type {
    Anonymous,
    Temporary,
    Registered,
  }
}

export = User;