import { EventEmitter } from 'events';
import { ReadStream } from 'fs';
import * as request from 'request';
import { parseString } from 'xml2js';
import * as Promise from 'bluebird';
import { assign, defaults } from 'lodash';
import * as Debug from 'debug';

const log = Debug('chatango:User:log');
const warn = Debug('chatango:User:warn');
const error = Debug('chatango:User:error');
const debug = Debug('chatango:User:debug');

import { Style, StylePartial, Background, BackgroundPartial, BackgroundAPIGet } from './Message';

/**
 * User class
 * manages all user-related tasks
 */

/**
 * Events
 */

/**
 * Message event
 * fired when the user has sent a message in a room
 * @event User#message
 * @param {Message} message - the message that was sent
 */

export enum UserTypes {
  Anon,
  Temp,
  Regi
}

export class User extends EventEmitter {
  // User Data
  name: string;
  password: string;
  type: UserTypes;
  id: string;
  ip: string;
  joined_at: number; // most recent server join time

  style: Style;
  background: Background;

  // Internals
  _connection_ids: Set<string> = new Set<string>();
  _inited: Promise<void>;

  private _cookies: request.CookieJar = request.jar();
  get ENDPOINT(): string {
    return `http://ust.chatango.com/profileimg/${this.name.charAt(0)}/${this.name.charAt(1)}/${this.name}`;
  }

  get is_inited(): boolean {
    return this._inited.isFulfilled();
  }

  static Types = UserTypes;

  static login(username: string, password: string): User {
    let me = new User(username, User.Types.Regi);
    me.password = password;
    return me;
  }

  /**
   * Get the name of the anonymous user given the raw message and session ID
   * taken and modified from ch.py - https://github.com/Nullspeaker/ch.py
   */
  static parseAnonName(message: string, _id: string): string {
    // last 4 digits of n_tag and id
    let n_tag;
    try {
      n_tag = message.match(/^<n(\d{4})\/>/)[1].split('');
    }
    catch (e) {
      return '';
    }
    const id = _id.slice(-4).split('');

    let ret = [];
    for (let i = 0; i < 4; i++) {
      // add each digit together
      const val = parseInt(n_tag[i], 10) + parseInt(id[i], 10);
      // take the single's digit
      ret.push(val.toString(10).slice(-1));
    }

    const name = 'anon' + ret.join('');
    debug(`Parsed anonymous name "${name}"`);
    return name;
  }

  constructor(name?: string, type?: UserTypes) {
    super();

    this.name = (name || '').toLowerCase();
    this.type = type || (this.name.length > 0 ? UserTypes.Temp : UserTypes.Anon);

    if (this.name.length > 0 && this.type === UserTypes.Regi) {
      this._init = this._initRegistered;
    }

    this.style = new Style();
    this.background = new Background();

    this._inited = this._init();
    // this._cookies.setCookie(request.cookie('cookies_enabled.chatango.com=yes'), 'http://chatango.com');
    // this.cookies.setCookie(request.cookie('fph.chatango.com=http'), 'http://.chatango.com');
  }

  toString(): string {
    return this.name;
  }

  /**
   * Get user styles and backgrounds, and authenticate if we have the password
   */
  private _initRegistered(): Promise<void> {
    return this._inited = this._getStyle()
    .catch((err) => {
      error(`Error fetching style data for ${this.name}, using default.`);
      return this.style;
    })
    .then((style) => {
      this.style = style;
      return this._getBackground();
    })
    .catch((err) => {
      error(`Error fetching background data for ${this.name}, using default.`);
      return this.background;
    })
    .then((background) => {
      this.background = background;
      if (this.password === undefined) {
        return;
      }
      return this._authorize();
    })
    .then(() => {
      log(`Initialized ${this.name}`);
    });
  }

  private _init(): Promise<void> {
    return this._inited = Promise.resolve();
  }

  /**
   * Authenticate this user to make setStyle, setBackground and setBackgroundImage requests
   */
  private _authorize(): Promise<void> {
    debug(`Authorizing ${this.name}`);
    return new Promise<void>((resolve, reject) => {
      request({
        url: 'http://chatango.com/login',
        method: 'POST',
        jar: this._cookies,
        form: {
          user_id: this.name,
          password: this.password,
          storecookie: 'on',
          checkerrors: 'yes'
        },
        headers: {
          'User-Agent': 'ChatangoJS',
          // 'Accept': '*/*',
        }
      }, (err, response, body) => {
        // chatango sends us the login html page if our credentials are wrong
        if (response.body.length !== 0) {
          err = new Error(`Invalid credentials`);
        }
        if (err) {
          error(`Error while authorizing ${this.name}: ${err}`);
          return reject(err);
        }
        if (response.statusCode !== 200) {
          error(`Error while authorizing ${this.name}: ${response.statusMessage}`);
          return reject(new Error(`${response.statusCode}: ${response.statusMessage}`));
        }
        log(`Authorized ${this.name}`);
        resolve();
      });
    });
  }

  /**
   * Get the Message style for this User
   */
  getStyle(): Promise<Style> {
    if (this.is_inited) {
      return Promise.resolve(this.style);
    }
    return this._inited.then(() => this.style);
  }

  private _getStyle(): Promise<Style> {
    debug(`Getting style for ${this.name}`);
    return new Promise<Style>((resolve, reject) => {
      request(`${this.ENDPOINT}/msgstyles.json`, (err, response, body) => {
        if (err) {
          error(`Error while retrieving style for ${this.name}: ${err}`);
          return reject(err);
        }
        if (response.statusCode !== 200) {
          error(`Error while retrieving style for ${this.name}: ${response.statusMessage}`);
          return reject(new Error(`${response.statusCode}: ${response.statusMessage}`));
        }
        debug(`Retrieved style for ${this.name}`);
        if (response.headers['content-type'] === 'image/jpeg') {
          debug(`User ${this.name} has no style data. Using default.`);
          return resolve(new Style());
        }
        try {
          resolve(new Style(JSON.parse(body)));
        }
        catch (err) {
          error(`Errored parsing getStyle(): ${err}`);
          reject(err);
        }
      });
    });
  }

  /**
   * Set the styling for this User
   * some styles are ignored if you are a temporary or anonymous user
   */
   setStyle(style: StylePartial): Promise<void> {
     return this._inited.then(() => {
       debug(`Setting style for ${this.name}`);
       assign(this.style, style);
     });
   }

   /**
    * Save the styling for this User
    * must be authenticated
    */
  saveStyle(style?: StylePartial): Promise<Style> {
    if (this.type !== User.Types.Regi) {
      throw new TypeError(`Tried to save style as a non-registered User: ${this.name}`);
    }
    return this.setStyle(style).then(() => {
      debug(`Saving style for ${this.name}`);
      return new Promise<Style>((resolve, reject) => {
        // cast to strings for form-data
        const data = {};
        for (let key in this.style) {
          data[key] = String(this.style[key]);
        }
        request({
          url: 'http://chatango.com/updatemsgstyles',
          method: 'POST',
          jar: this._cookies,
          formData: assign(data, {
            'lo': this.name,
            'p': this.password,
          }),
          headers: {
            'User-Agent': 'ChatangoJS',
          }
        }, (err, response, body) => {
          if (err) {
            error(`Error while saving style for ${this.name}: ${err}`);
            return reject(err);
          }
          if (response.statusCode !== 200) {
            error(`Error while saving style for ${this.name}: ${response.statusMessage}`);
            return reject(new Error(`${response.statusCode}: ${response.statusMessage}`));
          }
          log(`Saved style for ${this.name}`);
          resolve(this.style);
        });
      });
    });
  }

  /**
   * Get the background styling for this User
   */
  getBackground(): Promise<Background> {
    if (this.is_inited) {
      return Promise.resolve(this.background);
    }
    return this._inited.then(() => this.background);
  }

  private _getBackground(): Promise<Background> {
    debug(`Getting background for ${this.name}`);
    return new Promise<any>((resolve, reject) => {
      request(`${this.ENDPOINT}/msgbg.xml`, (err, response, body) => {
        if (err) {
          error(`Error while retrieving background for ${this.name}: ${err}`);
          return reject(err);
        }
        if (response.statusCode !== 200) {
          error(`Error while retrieving background for ${this.name}: ${response.statusMessage}`);
          return reject(new Error(`${response.statusCode}: ${response.statusMessage}`));
        }
        debug(`Retrieved background for ${this.name}`);
        resolve(response);
      });
    })
    .then((response) => {
      debug(`Parsing background for ${this.name}`);
      return new Promise<Background>((resolve, reject) => {
        if (response.headers['content-type'] === 'image/jpeg') {
          debug(`User ${this.name} has no background data. Using default.`);
          return resolve(new Background());
        }
        parseString(response.body, (err, result) => {
          if (err) {
            error(`Error while parsing background for ${this.name}: ${err}`);
            return reject(err);
          }
          debug(`Parsed background for ${this.name}`);
          resolve(new Background(result));
        });
      });
    });
  }

  /**
   * Set the background styling for this User
   * some background styles are ignored if you are a temporary or anonymous user
   */
  setBackground(background: BackgroundPartial): Promise<void> {
    return this._inited.then(() => {
      debug(`Setting background for ${this.name}`);
      assign(this.background, background);
    });
  }

  /**
   * Save the background styling for this User
   * must be authenticated
   */
  saveBackground(background?: BackgroundPartial): Promise<Background> {
    if (this.type !== User.Types.Regi) {
      throw new TypeError(`Tried to save background style as a non-registered User: ${this.name}`);
    }
    return this.setBackground(background).then(() => {
      debug(`Saving background for ${this.name}`);
      return new Promise<Background>((resolve, reject) => {
        request({
          url: 'http://chatango.com/updatemsgbg',
          method: 'POST',
          jar: this._cookies,
          form: assign({
            'lo': this.name,
            'p': this.password
          }, this.background),
          headers: {
            'User-Agent': 'ChatangoJS'
          }
        }, (err, response, body) => {
          if (err) {
            error(`Error while saving background for ${this.name}: ${err}`);
            return reject(err);
          }
          if (response.statusCode !== 200) {
            error(`Error while saving background for ${this.name}: ${response.statusMessage}`);
            return reject(new Error(`${response.statusCode}: ${response.statusMessage}`));
          }
          log(`Saved background for ${this.name}`);
          resolve(this.background);
        });
      });
    });
  }

  /**
   * Save the background image for this User
   * must be authenticated
   */
  saveBackgroundImage(stream: ReadStream): Promise<void> {
    debug(`Saving background image for ${this.name}`);
    return this._inited.then(() => {
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
        }, (err, response, body) => {
          if (err) {
            error(`Error while saving background image for ${this.name}: ${err}`);
            return reject(err);
          }
          if (response.statusCode !== 200) {
            error(`Error while saving background for ${this.name}: ${response.statusMessage} => Are you authenticated?`);
            return reject(new Error(`${response.statusCode}: ${response.statusMessage}`));
          }
          log(`Saved background image for ${this.name}`);
          resolve();
        });
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
   * Static accessors for the above properties
   * requires initializing for stupid reasons (ENDPOINT property)
   * TODO - fix the above and call these from the prototype?
   */
  static getStyle(username: string): Promise<Style> {
    return new User(username)._getStyle();
  }

  static getBackground(username: string): Promise<Background> {
    return new User(username)._getBackground();
  }

  static getBackgroundImage(username: string): request.Request {
    return new User(username).getBackgroundImage();
  }

  static getAvatar(username: string): request.Request {
    return new User(username).getAvatar();
  }
}

export default User;
