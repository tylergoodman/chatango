/// <reference path="../typings/tsd.d.ts" />

import fs = require('fs');
import request = require('request');
import xml2js = require('xml2js');
import Promise = require('bluebird');
import winston = require('winston');
import _ = require('lodash');

import Message = require('./Message');
import util = require('./util');

class User {
  username: string;
  password: string;
  type: User.Type;

  joined_at: number;
  session_ids: util.Set<string> = new util.Set<string>();

  style: Message.Style = new Message.Style;
  background: Message.Background = new Message.Background;
  hasInited: boolean = false;

  private _cookies: request.CookieJar = request.jar();

  private static endpoint: string = 'http://ust.chatango.com/profileimg';

  get endpoint_url(): string {
    return `${User.endpoint}/${this.username.charAt(0)}/${this.username.charAt(1)}/${this.username}`;
  }

  constructor(username: string = '', password: string = '', type?: User.Type) {
    this.username = username;
    this.password = password;

    if (type === void 0) {
      if (!username && !password) {
        type = User.Type.Anonymous;
      }
      else if (!password) {
        type = User.Type.Temporary;
      }
      else {
        type = User.Type.Registered;
      }
    }
    this.type = type;
//    this.cookies.setCookie(request.cookie('cookies_enabled.chatango.com=yes'), 'http://.chatango.com');
//    this.cookies.setCookie(request.cookie('fph.chatango.com=http'), 'http://.chatango.com');

//    this.init();
  }

  toString(): string {
    return `${this.username}#${this.session_ids}`;
  }

  init(): Promise<any> {
    if (this.type === User.Type.Registered) {
      return this.authenticate()
        .then(() => {
          return this.getStyle();
        })
        .then(() => {
          return this.getBackground();
        })
        .then(() => {
          this.hasInited = true;
        });
    }
    return Promise.resolve();
  }

  authenticate(): Promise<void> {
    winston.log('silly', `Authenticating user ${this.username}`);
    return new Promise<void>((resolve, reject) => {
      request({
        url: 'http://scripts.st.chatango.com/setcookies',
        method: 'POST',
        jar: this._cookies,
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
        // maybe fix this instead of sneaking it by the compiler later
        this.style = JSON.parse(body);
        this.style.fontSize = Number(this.style.fontSize);
        this.style.usebackground = Number(this.style.usebackground);
        resolve(this.style);
      });
    })
  }

  static getStyle(username: string): Promise<Message.Style> {
    return new User(username).getStyle();
  }

  setStyle(style: Message.Style = new Message.Style): Promise<Message.Style> {
    winston.log('silly', `Saving style for user ${this.username}`);

    // because js arguments are more flexible than typescript definitions...
    style = _.extend<{}, Message.Style, Message.Style, {}, Message.Style>(this.style, style);

    var data = _.transform<Message.Style, {}>(style, (result, value, key) => {
      result[key] = String(value);
    });

    return new Promise<Message.Style>((resolve, reject) => {
      request({
        url: 'http://chatango.com/updatemsgstyles',
        method: 'POST',
        jar: this._cookies,
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
        resolve(response);
      });
    })
    .then((response) => {
      winston.log('silly', `Parsing background for ${this.username}`);
      return new Promise<Message.Background>((resolve, reject) => {
        if (response.headers['content-type'] === 'image/jpeg') {
          winston.log('warn', `User ${this.username} has no background data. Using default.`);
          this.background = new Message.Background;
          return resolve(this.background);
        }
        xml2js.parseString<Message.BackgroundAPIGet>(response.body, (err, result) => {
          if (err) {
            winston.log('error', `Error while parsing background for user ${this.username}`);
            return reject(err);
          }
          winston.log('verbose', `Retrieved background for user ${this.username}`);
          this.background = new Message.Background(result);
          resolve(this.background);
        });
      });
    });
  }

  static getBackground(username: string): Promise<Message.Background> {
    return new User(username).getBackground();
  }

  setBackground(background: Message.Background = new Message.Background): Promise<Message.Background> {
    winston.log('silly', `Saving background for user ${this.username}`);

    // how do I get this to infer correctly
    background = _.extend<{}, Message.Background, Message.Background, {}, Message.Background>(this.background, background);

    return new Promise<Message.Background>((resolve, reject) => {
      request({
        url: 'http://chatango.com/updatemsgbg',
        method: 'POST',
        jar: this._cookies,
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
        jar: this._cookies,
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
    return new User(username).getBackgroundImage();
  }

  getAvatar(): request.Request {
    return request(`${this.endpoint_url}/thumb.jpg`);
  }
  static getAvatar(username: string): request.Request {
    return new User(username).getAvatar();
  }

  static getAnonName(message: string, _id: string): string {
    // last 4 digits of n_tag and id
    var n_tag = message.match(/^<n(\d{4})\/>/)[1].split('');
    var id = _id.slice(-4).split('');

    var ret = [];

    for (var i = 0; i < 4; i++) {
      // add each digit together
      var val = parseInt(n_tag[i], 10) + parseInt(id[i], 10);
      // take the single's digit
      ret.push(String(val).slice(-1));
    }

    return 'anon' + ret.join('');
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