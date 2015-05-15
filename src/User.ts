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

  style: Message.Style = {
    name: '',
    font: {
      color: '',
      size: 11,
      face: Message.Font.Arial,
      bold: false,
      italics: false,
      underline: false
    },
    background: {
      align: 'tl',
      ialp: 100,
      tile: 1,
      bgalp: 100,
      bgc: '',
      useimg: 0,
      hasrec: 0,
      isvid: 0
    }
  };

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
    winston.log('silly', `Getting style data for user ${this.username}`);
    return new Promise<Message.StyleAPIGet>((resolve, reject) => {
      request(`${this.endpoint_url}/msgstyles.json`, (error, response, body) => {
        if (error) {
          winston.log('error', `Error while retrieving style data for user ${this.username}`);
          return reject(error);
        }
        winston.log('silly', `Retrieved style data for user ${this.username}`);
        resolve(JSON.parse(body));
      });
    })
    .then((style) => {
      this.style.name = style.nameColor;
      this.style.font.color = style.textColor;
      this.style.font.size = Number(style.fontSize);
      this.style.font.face = Message.Font[style.fontFamily];
      this.style.font.bold = style.bold;
      this.style.font.italics = style.italics;
      this.style.font.underline = style.underline;
      winston.log('verbose', `Retrieved style for user ${this.username}`);
      return this.style;
    });
  }

  getBackground(): Promise<Message.Background> {
    winston.log('silly', `Getting background xml for user ${this.username}`);
    return new Promise<string>((resolve, reject) => {
      request(`${this.endpoint_url}/msgbg.xml`, (error, response, body) => {
        if (error) {
          winston.log('error', `Error while retrieving background xml for user ${this.username}`);
          return reject(error);
        }
        winston.log('silly', `Retrieved background xml for user ${this.username}`);
        resolve(body);
      });
    })
    .then((body) => {
      winston.log('silly', `Parsing background xml for ${this.username}`);
      return new Promise<Message.BackgroundAPIGet>((resolve, reject) => {
        xml2js.parseString(body, (err, result) => {
          if (err) {
            winston.log('error', `Error while parsing background xml for user ${this.username}`);
            return reject(err);
          }
          winston.log('silly', `Parsed background xml for user ${this.username}`);
          resolve(result);
        });
      });
    })
    .then((result) => {
      this.style.background = {
        'align': result.bgi.$.align,
        'ialp': Number(result.bgi.$.ialp),
        'tile': Number(result.bgi.$.tile),
        'bgalp': Number(result.bgi.$.bgalp),
        'bgc': result.bgi.$.bgc,
        'useimg': Number(result.bgi.$.useimg),
        'hasrec': Number(result.bgi.$.hasrec),
        'isvid': Number(result.bgi.$.isvid),
      };
      winston.log('verbose', `Retrieved background for user ${this.username}`);
      return this.style.background;
    });
  }

  setBackground(background: Message.Background = this.style.background): Promise<void> {
    winston.log('silly', `Saving background for user ${this.username}`);
    var data = _.extend(this.style.background, background);
    data['lo'] = this.username;
    data['p'] = this.password;

    return new Promise<void>((resolve, reject) => {
      request({
        url: 'http://chatango.com/updatemsgbg',
        method: 'POST',
        jar: this.cookies,
        form: data,
        headers: {
          'User-Agent': 'ChatangoJS'
        }
      }, (error, response, body) => {
        if (error) {
          winston.log('error', `Error while saving background for user ${this.username}: ${error}`);
          return reject(error);
        }
        if (response.statusCode !== 200) {
          winston.log('error', `Error while saving background for user ${this.username}: ${response.statusMessage}\nAre you authenticated?`);
          return reject(new Error(response.statusMessage));
        }
        winston.log('verbose', `Saved background for user ${this.username}`);
        resolve();
      });
    });
  }

  setBackgroundImage(stream: fs.ReadStream): Promise<any> {
    winston.log('silly', `Saving background image for user ${this.username}`);
    return new Promise((resolve, reject) => {
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
          return reject(new Error(response.statusMessage));
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