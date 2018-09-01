import { EventEmitter } from 'events';
import * as querystring from 'querystring';
import * as Debug from 'debug';

import fetch from './helpers/fetch';
import parseXML from './helpers/parseXML';
import parseCookies from './helpers/parseCookies';
import requiresUserAuth from './decorators/requiresUserAuth';


const debug = Debug('chatango:User');

enum UserType {
  Anon,
  Temp,
  Registered,
};

export namespace UserSettings {

  enum Font {
    Arial,
    Comic,
    Georgia,
    Handwriting,
    Impact,
    Palatino,
    Papyrus,
    Times,
    Typewriter,
  }

  export class Style {
    stylesOn: boolean = false; // whether these styles are shown or not
    fontFamily: number = 0; // [0..8], the enumerated font face list
    fontSize: number = 11; // [9..22], font size
    usebackground: number = 0; // [0, 1], whether to display the background data
    textColor: string = '000000'; // [000000..ffffff], hex code for font color
    nameColor: string = '000000'; // [000000..ffffff], hex code for name color
    bold: boolean = false;
    italics: boolean = false;
    underline: boolean = false;

    static Font = Font;

    static fromAPIGet(json: ChatangoAPI.Style) {
      const style = new Style();
      style.stylesOn = json.stylesOn;
      style.fontFamily = Number.parseInt(json.fontFamily, 10);
      style.fontSize = Number.parseInt(json.fontSize, 10);
      style.usebackground = Number.parseInt(json.usebackground, 10);
      style.textColor = json.textColor;
      style.nameColor = json.nameColor;
      style.bold = json.bold;
      style.italics = json.italics;
      style.underline = json.underline;
      return style;
    }
  }


  export class Background {
    align: string = 'tl'; // [tl, tr, bl, br], anchor of image
    ialp: number = 100; // [0..100], alpha of the image
    tile: number = 0; // [0, 1], whether to tile
    bgalp: number = 100; // [0..100], alpha of the color
    bgc: string = ''; // [000000..ffffff], hex code for background color
    useimg: number = 0; // [0, 1], whether to use image
    hasrec: number = 0; // [0, 1], don't know
    isvid: number = 0; // [0, 1], don't know

    static fromAPIGet(json: ChatangoAPI.Background) {
      const background = new Background();
      background.align = json.bgi.$.align;
      background.ialp = Number.parseInt(json.bgi.$.ialp, 10);
      background.tile = Number.parseInt(json.bgi.$.tile, 10);
      background.bgalp = Number.parseInt(json.bgi.$.bgalp, 10);
      background.bgc = json.bgi.$.bgc;
      background.useimg = Number.parseInt(json.bgi.$.useimg, 10);
      background.hasrec = Number.parseInt(json.bgi.$.hasrec, 10);
      background.isvid = Number.parseInt(json.bgi.$.isvid, 10);
      return background;
    }
  }
}

class User extends EventEmitter {
  name: string;
  password: string;

  type: UserType;
  id: string;
  ip: string;
  joined_at: number;

  private _auth: string;
  // private _connection_ids = new Set<string>();
  // private _has_initialized = false;

  constructor(name?: string, password?: string, type = UserType.Registered) {
    super();

    this.name = name;
    this.password = password;
    this.type = type;
  }

  static Type = UserType;
  static parseAnonName(message: string, _id: string): string {
    /**
     * Get the name of the anonymous user given the raw message and session ID
     * taken and modified from ch.py - https://github.com/Nullspeaker/ch.py
     */
    // last 4 digits of n_tag and id
    // TODO - parsing out the n-tag should be done somewhere else
    let n_tag;
    try {
      n_tag = message.match(/^<n(\d{4})\/>/)[1].split('');
    }
    catch (e) {
      console.warn(`Failed to parse anonymous name "${message}"`, e);
      return '';
    }
    const id = _id.slice(-4).split('');

    const digits = [];
    for (let i = 0; i < 4; i++) {
      // add each digit together
      const val = Number.parseInt(n_tag[i], 10) + Number.parseInt(id[i], 10);
      // take the single's digit
      digits.push(val.toString(10).slice(-1));
    }

    const name = `anon${digits.join('')}`;
    debug(`Parsed anonymous name "${name}"`);
    return name;
  }

  static getEndpoint(name: string): string {
    return `http://ust.chatango.com/profileimg/${name.charAt(0)}/${name.charAt(1)}/${name}`;
  }

  static async getStyle(name: string): Promise<UserSettings.Style> {
    debug(`Getting style for "${name}"`);
    try {
      const res = await fetch(`${User.getEndpoint(name)}/msgstyles.json`);
      if (res.status !== 200) {
        throw new Error(`${res.status}: ${await res.text()}`);
      }
      debug(`Got style for "${name}"`);
      if (res.headers.get('content-type') === 'image/jpeg') {
        debug(`User "${name}" has no style data. Using default.`);
        return new UserSettings.Style();
      }
      const json = await res.json<ChatangoAPI.Style>();
      return UserSettings.Style.fromAPIGet(json);
    }
    catch (err) {
      debug(`Error while getting style for "${name}": ${err}`);
      throw err;
    }
  }

  static async getBackground(name: string): Promise<UserSettings.Background> {
    debug(`Getting background for "${name}"`);
    try {
      const res = await fetch(`${User.getEndpoint(name)}/msgbg.xml`);
      if (res.status !== 200) {
        throw new Error(`${res.status}: ${await res.text()}`);
      }
      debug(`Got background for "${name}"`);
      if (res.headers.get('content-type') === 'image/jpeg') {
        debug(`User "${name}" has no background data. Using default.`);
        return new UserSettings.Background();
      }
      const json = await parseXML<ChatangoAPI.Background>(await res.text());
      return UserSettings.Background.fromAPIGet(json);
    }
    catch (err) {
      debug(`Error while getting background for "${name}": ${err}`);
      throw err;
    }
  }

  getStyle(): Promise<UserSettings.Style> {
    return User.getStyle(this.name);
  }

  getBackground(): Promise<UserSettings.Background> {
    return User.getBackground(this.name);
  }

  static async getToken(name: string, password: string): Promise<string> {
    debug(`Getting token for "${name}"`);
    try {
      const res = await fetch('http://chatango.com/login', {
        method: 'POST',
        body: querystring.stringify({
          user_id: name,
          password: password,
          storecookie: 'on',
          checkerrors: 'yes',
        }),
      });
      if (res.status !== 200) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      const body = await res.text();
      if (body.length !== 0) {
        throw new Error('Invalid credentials');
      }
      debug(`Got token for "${name}"`);
      const cookies = parseCookies(res.headers);
      const auth = cookies.find(({ name }) => name === 'auth.chatango.com');
      console.log(auth);
      console.log(cookies);
      return auth.value;
    }
    catch (err) {
      debug(`Error while getting token for "${name}": ${err}`);
      throw err;
    }
  }

  private async _getToken(): Promise<string> {
    if (this._auth) {
      return this._auth;
    }
    const auth = await User.getToken(this.name, this.password);
    return this._auth = auth;
  }

  static async setStyle(name: string, password: string, style?: Partial<UserSettings.Style>, opts = { save: false }) {

  }
}

export default User;
