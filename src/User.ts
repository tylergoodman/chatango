/// <reference path="../typings/request/request.d.ts" />
/// <reference path="../typings/xml2js/xml2js.d.ts" />
/// <reference path="../typings/bluebird/bluebird.d.ts" />

import request = require('request');
import xml2js = require('xml2js');
import Promise = require('bluebird');

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

  authenticated: boolean = false;
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

    this.cookies.setCookie(request.cookie('cookies_enabled.chatango.com=yes'), 'http://.chatango.com');
    this.cookies.setCookie(request.cookie('fph.chatango.com=http'), 'http://.chatango.com');

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
    return this.getBackground();
  }

  authenticate(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      request.post({
        url: 'http://scripts.st.chatango.com/setcookies',
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
          return reject(error);
        }
        resolve();
      });
    });
  }

  getStyle(): Promise<Message.Style> {
    return new Promise<Message.StyleAPIGet>((resolve, reject) => {
      request(`${this.endpoint_url}/msgstyles.json`, (error, response, body) => {
        if (error) {
          return reject(error);
        }
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
      return this.style;
    });
  }

  getBackground(): Promise<Message.Background> {
    return new Promise<string>((resolve, reject) => {
      request(`${this.endpoint_url}/msgbg.xml`, (error, response, body) => {
        if (error) {
          return reject(error);
        }
        resolve(body);
      });
    })
    .then((body) => {
      return new Promise<Message.BackgroundAPIGet>((resolve, reject) => {
        xml2js.parseString(body, (err, result) => {
          if (err) {
            return reject(err);
          }
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
      return this.style.background;
    });
  }

  // TODO - setBackground()

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