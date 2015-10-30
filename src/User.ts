/// <reference path="../typings/tsd.d.ts" />

import events = require('events');
import fs = require('fs');
import request = require('request');
import xml2js = require('xml2js');
import Promise = require('bluebird');
import winston = require('winston');
import _ = require('lodash');

import Message = require('./Message');
import util = require('./util');

/**
 * User class
 * manages all user-related tasks
 * TODO - make this a 'singleton' factory, or cache users in Room temporarily with a limit
 */

/**
 * Events
 */

/**
 * Message event
 * fired when the user has sent a message in a room
 *
 * @event User#message
 * @param {Message} message - the message that was sent
 */

// todo - add ban/msgdel/allmsgdel

class User extends events.EventEmitter {
  name: string;
  password: string;

  joined_at: number = 0;
  style: Message.Style = new Message.Style;
  background: Message.Background = new Message.Background;

  _connection_ids: util.Set<string> = new util.Set<string>();

  private _cookies: request.CookieJar = request.jar();
  get ENDPOINT(): string {
    return `http://ust.chatango.com/profileimg/${this.name.charAt(0)}/${this.name.charAt(1)}/${this.name}`;
  }

  constructor(name: string, password?: string) {
    super();

    this.name = name;
    this.password = password;
//    this.cookies.setCookie(request.cookie('cookies_enabled.chatango.com=yes'), 'http://.chatango.com');
//    this.cookies.setCookie(request.cookie('fph.chatango.com=http'), 'http://.chatango.com');
  }

  toString(): string {
    return `${this.name}`;
  }

  /**
   * Populate this user with their saved Message styles
   */
  init(): Promise<void> {
    var promise;
    if (this.password === void 0) {
      promise = Promise.resolve();
    }
    else {
      promise = this.authorize();
    }

    return promise
      .then(() => {
        return this.getStyle();
      })
      .then((style) => {
        this.style = style;
      })
      .then(() => {
        return this.getBackground();
      })
      .then((background) => {
        this.background = background;
        winston.log('verbose', `Initialized user: "${this.name}"`);
      });
  }

  /**
   * Authorize this user to make setStyle, setBackground and setBackgroundImage requests
   */
  authorize(): Promise<void> {
    winston.log('debug', `Authorizing user "${this.name}"`);
    return new Promise<void>((resolve, reject) => {
      request({
        url: 'http://scripts.st.chatango.com/setcookies',
        method: 'POST',
        jar: this._cookies,
        form: {
          pwd: this.password,
          sid: this.name
        },
        headers: {
          'User-Agent': 'ChatangoJS'
        }
      }, (error, response, body) => {
        if (error) {
          winston.log('error', `Error while authorizing user "${this.name}": ${error}`);
          return reject(error);
        }
        if (response.statusCode !== 200) {
          winston.log('error', `Error while authorizing user "${this.name}": ${response.statusMessage}`);
          return reject(new Error(`${response.statusCode}: ${response.statusMessage}`));
        }
        winston.log('info', `Authorized user "${this.name}"`);
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

  /**
   * Get the Message style for this User
   */
  getStyle(): Promise<Message.Style> {
    winston.log('debug', `Getting style for user "${this.name}"`);
    return new Promise<Message.Style>((resolve, reject) => {
      request(`${this.ENDPOINT}/msgstyles.json`, (error, response, body) => {
        if (error) {
          winston.log('error', `Error while retrieving style for user "${this.name}"`);
          return reject(error);
        }
        if (response.statusCode !== 200) {
          winston.log('error', `Error while retrieving style for user "${this.name}": ${response.statusMessage}`);
          return reject(new Error(`${response.statusCode}: ${response.statusMessage}`));
        }
        winston.log('verbose', `Retrieved style for user "${this.name}"`);
        // maybe fix this instead of sneaking it by the compiler later
        try {
          var style = JSON.parse(body);
          style.fontSize = Number(style.fontSize);
          style.usebackground = Number(style.usebackground);
          resolve(style);
        }
        catch (err) {
          resolve(this.style);
        }
      });
    });
  }

  /**
   * Set the styling for this User
   * must be authenticated
   */
  setStyle(style: Message.Style = new Message.Style): Promise<Message.Style> {
    winston.log('debug', `Saving style for user "${this.name}"`);

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
          'lo': this.name,
          'p': this.password,
        }, data),
        headers: {
          'User-Agent': 'ChatangoJS',
        }
      }, (error, response, body) => {
        if (error) {
          winston.log('error', `Error while saving style for user "${this.name}": ${error}`);
          return reject(error);
        }
        if (response.statusCode !== 200) {
          winston.log('error', `Error while saving style for user "${this.name}": ${response.statusMessage}`);
          return reject(new Error(`${response.statusCode}: ${response.statusMessage}`));
        }
        winston.log('verbose', `Saved style for user "${this.name}"`);
        this.style = style;
        resolve(style);
      });
    });
  }

  /**
   * Get the background styling for this User
   */
  getBackground(): Promise<Message.Background> {
    winston.log('debug', `Getting background for user "${this.name}"`);
    return new Promise<any>((resolve, reject) => {
      request(`${this.ENDPOINT}/msgbg.xml`, (error, response, body) => {
        if (error) {
          winston.log('error', `Error while retrieving background for user "${this.name}"`);
          return reject(error);
        }
        if (response.statusCode !== 200) {
          winston.log('error', `Error while retrieving background for user "${this.name}": ${response.statusMessage}`);
          return reject(new Error(`${response.statusCode}: ${response.statusMessage}`));
        }
        winston.log('silly', `Retrieved background for user "${this.name}"`);
        resolve(response);
      });
    })
    .then((response) => {
      winston.log('silly', `Parsing background for "${this.name}"`);
      return new Promise<Message.Background>((resolve, reject) => {
        if (response.headers['content-type'] === 'image/jpeg') {
          winston.log('warn', `User "${this.name}" has no background data. Using default.`);
          this.background = new Message.Background;
          return resolve(this.background);
        }
        xml2js.parseString<Message.BackgroundAPIGet>(response.body, (err, result) => {
          if (err) {
            winston.log('error', `Error while parsing background for user "${this.name}"`);
            return reject(err);
          }
          winston.log('verbose', `Retrieved background for user "${this.name}"`);
          this.background = new Message.Background(result);
          resolve(this.background);
        });
      });
    });
  }

  /**
   * Set the background styling for this User
   * must be authenticated
   */
  setBackground(background: Message.Background = new Message.Background): Promise<Message.Background> {
    winston.log('silly', `Saving background for user "${this.name}"`);

    // how do I get this to infer correctly
    background = _.extend<{}, Message.Background, Message.Background, {}, Message.Background>(this.background, background);

    return new Promise<Message.Background>((resolve, reject) => {
      request({
        url: 'http://chatango.com/updatemsgbg',
        method: 'POST',
        jar: this._cookies,
        form: _.extend(background, {
          'lo': this.name,
          'p': this.password
        }),
        headers: {
          'User-Agent': 'ChatangoJS'
        }
      }, (error, response, body) => {
        if (error) {
          winston.log('error', `Error while saving background for user "${this.name}": ${error}`);
          return reject(error);
        }
        if (response.statusCode !== 200) {
          winston.log('error', `Error while saving background for user "${this.name}": ${response.statusMessage}`);
          return reject(new Error(`${response.statusCode}: ${response.statusMessage}`));
        }
        winston.log('verbose', `Saved background for user "${this.name}"`);
        this.background = background;
        resolve(background);
      });
    });
  }

  /**
   * Set the background image for this User
   * must be authenticated
   */
  setBackgroundImage(stream: fs.ReadStream): Promise<void> {
    winston.log('silly', `Saving background image for user "${this.name}"`);
    return new Promise<void>((resolve, reject) => {
      request({
        url: 'http://chatango.com/updatemsgbg',
        method: 'POST',
        jar: this._cookies,
        headers: {
          'User-Agent': 'ChatangoJS'
        },
        formData: {
          'lo': this.name,
          'p': this.password,
          'Filedata': stream
        }
      }, (error, response, body) => {
        if (error) {
          winston.log('error', `Error while saving background image for user "${this.name}": ${error}`);
          return reject(error);
        }
        if (response.statusCode !== 200) {
          winston.log('error', `Error while saving background for user "${this.name}": ${response.statusMessage}\nAre you authenticated?`);
          return reject(new Error(`${response.statusCode}: ${response.statusMessage}`));
        }
        winston.log('verbose', `Set background image for user "${this.name}"`);
        resolve();
      });
    });
  }

  /**
   * Get the background image for this User
   * TODO - return just the data stream?
   */
  getBackgroundImage(): request.Request {
    return request(`${this.ENDPOINT}/msgbg.jpg`);
  }

  /**
   * Get the avatar image for this User
   * TODO - return just the data stream?
   */
  getAvatar(): request.Request {
    return request(`${this.ENDPOINT}/thumb.jpg`);
  }

  /**
   * Get the name of the anonymous user given the raw message and session ID
   * taken and modified from ch.py - https://github.com/Nullspeaker/ch.py
   */
  static parseAnonName(message: string, _id: string): string {
    // last 4 digits of n_tag and id
    var n_tag;
    try {
      n_tag = message.match(/^<n(\d{4})\/>/)[1].split('');
    }
    catch (e) {
      return '';
    }
    var id = _id.slice(-4).split('');

    var ret = [];

    for (var i = 0; i < 4; i++) {
      // add each digit together
      var val = parseInt(n_tag[i], 10) + parseInt(id[i], 10);
      // take the single's digit
      ret.push(String(val).slice(-1));
    }

    var name = 'anon' + ret.join('');
    winston.log('debug', `Parsed anonymous user name "${name}"`);
    return name;
  }

  /**
   * Static accessors for the above properties
   * requires initializing for stupid reasons (ENDPOINT property)
   * TODO - fix the above and call these from the prototype?
   */
  static getStyle(username: string): Promise<Message.Style> {
    return new User(username).getStyle();
  }

  static getBackground(username: string): Promise<Message.Background> {
    return new User(username).getBackground();
  }

  static getBackgroundImage(username: string): request.Request {
    return new User(username).getBackgroundImage();
  }

  static getAvatar(username: string): request.Request {
    return new User(username).getAvatar();
  }
}

module User {
  /**
   * ID interface
   * used for identifying anonymous and temporary users, which is required for message deleting and banning
   */
  export interface ID {
    name: string;
    id: string;
    ip: string;
  }
}

export = User;
