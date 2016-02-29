import { assign, unescape } from 'lodash';
import User from './User';
import Room from './Room';

/**
 * Message class
 */
export class Message {
  id: string;
  user: User;
  created_at: number;
  body: string;
  style: Style;
  room: Room;

  constructor() {
    this.style = new Style;
  }

  toString(): string {
    return `${this.user.toString()}: ${this.body}`;
  }

  static tokens = {
    MESSAGE_PARSE: /^(?:<n(?:(?:\d{4})|((?:[a-fA-F0-9]{3}){1,2}))?\/>)?(?:<f x(\d{2})?((?:[a-fA-F0-9]{3}){1,2})?\=\"(\d+)?\">)?([\s\S]+)$/,
    FORMAT: /(?:<([biu])>)([\s\S]+?)<\/\1>/
  }

  static parse(raw: string): Message {
    const message = new Message;

    let [
      input,
      nameColor,
      fontSize,
      textColor,
      fontFamily,
      body
    ] = raw.match(Message.tokens.MESSAGE_PARSE);

    if (nameColor)
      message.style.nameColor = nameColor;
    if (fontSize)
      message.style.fontSize = parseInt(fontSize, 10);
    if (textColor)
      message.style.textColor = textColor;
    if (fontFamily)
      message.style.fontFamily = parseInt(fontFamily, 10);

    body = body.replace(/<br\/>/g, '\n');

    let format: RegExpMatchArray;
    while (format = body.match(Message.tokens.FORMAT)) {
      switch (format[1]) {
        case 'b':
          message.style.bold = true;
          break;
        case 'i':
          message.style.italics = true;
          break;
        case 'u':
          message.style.underline = true;
          break;
      }
      body = format[2];
    }

    body = unescape(body);
    message.body = body;

    return message;
  }
}

export interface StyleAPIGet {
  stylesOn: boolean;
  fontFamily: string;
  fontSize: string;
  usebackground: string;
  textColor: string;
  nameColor: string;
  bold: boolean;
  italics: boolean;
  underline: boolean;
}
export interface StylePartial {
  stylesOn?: boolean;
  fontFamily?: number;
  fontSize?: number;
  usebackground?: number;
  textColor?: string;
  nameColor?: string;
  bold?: boolean;
  italics?: boolean;
  underline?: boolean;
}
export class Style {
  stylesOn: boolean; // whether these styles are shown or not
  fontFamily: number; // [0..8], the enumerated font face list
  fontSize: number; // [9..22], font size
  usebackground: number; // [0, 1], whether to display the background data
  textColor: string; // [000000..ffffff], hex code for font color
  nameColor: string; // [000000..ffffff], hex code for name color

  bold: boolean;
  italics: boolean;
  underline: boolean;

  constructor (args?: StyleAPIGet) {
    if (args !== undefined) {
      this.stylesOn = args.stylesOn;
      this.fontFamily = parseInt(args.fontFamily, 10);
      this.fontSize = parseInt(args.fontSize, 10);
      this.usebackground = parseInt(args.usebackground, 10);
      this.textColor = args.textColor;
      this.nameColor = args.nameColor;
      this.bold = args.bold;
      this.italics = args.italics;
      this.underline = args.underline;
    }
  }
}
Style.prototype.stylesOn = false;
Style.prototype.fontFamily = 0;
Style.prototype.fontSize = 11;
Style.prototype.usebackground = 0;
Style.prototype.textColor = '000000';
Style.prototype.nameColor = '000000';
Style.prototype.bold = false;
Style.prototype.italics = false;
Style.prototype.underline = false;

export interface BackgroundAPIGet {
  bgi: {
    $: {
      align: string,
      bgalp: string,
      bgc: string,
      hasrec: string,
      ialp: string,
      isvid: string,
      tile: string,
      useimg: string,
    }
  }
}
export interface BackgroundPartial {
  align?: string;
  ialp?: number;
  tile?: number;
  bgalp?: number;
  bgc?: string;
  useimg?: number;
  hasrec?: number;
  isvid?: number;
}
export class Background {
  align: string; // [tl, tr, bl, br], positioning of image
  ialp: number; // [0..100], alpha of the image
  tile: number; // [0, 1], whether to tile
  bgalp: number; // [0..100], alpha of the color
  bgc: string; // [000000..ffffff], hex code for background color
  useimg: number; // [0, 1], whether to use image

  hasrec: number; // [0, 1], don't know
  isvid: number; // [0, 1], don't know

  constructor(args?: BackgroundAPIGet) {
    if (args !== void 0) {
      this.align = args.bgi.$.align;
      this.ialp = parseInt(args.bgi.$.ialp, 10);
      this.tile = parseInt(args.bgi.$.tile, 10);
      this.bgalp = parseInt(args.bgi.$.bgalp, 10);
      this.bgc = args.bgi.$.bgc;
      this.useimg = parseInt(args.bgi.$.useimg, 10);
      this.hasrec = parseInt(args.bgi.$.hasrec, 10);
      this.isvid = parseInt(args.bgi.$.isvid, 10);
    }
  }
}
Background.prototype.align = 'tl';
Background.prototype.ialp = 100;
Background.prototype.tile = 0;
Background.prototype.bgalp = 100;
Background.prototype.bgc = '';
Background.prototype.useimg = 0;
Background.prototype.hasrec = 0;
Background.prototype.isvid = 0;

export enum Font {
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

export interface MessageCacheOptions {
  size?: number;
}

export class MessageCache implements MessageCacheOptions {
  // Options
  size: number;

  // Internals
  private _pending: {[index: string]: string | Message} = {};
  private _cache: Message[] = [];
  private _dict: {[index: string]: Message} = {};

  private static DEFAULT_OPTIONS: MessageCacheOptions = {
    size: 100,
  };

  constructor(options?: MessageCacheOptions) {
    assign(this, MessageCache.DEFAULT_OPTIONS, options);
  }

  toString(): string {
    return this._cache.toString();
  }

  private _push(message: Message, new_id: string): void {
    // remove from pending
    delete this._pending[message.id];
    // assign new ID
    message.id = new_id;
    // add to dictionary
    this._dict[new_id] = message;
    // add to cache
    this._cache.push(message);
    // remove oldest
    if (this._cache.length > this.size) {
      var old = this._cache.shift();
      delete this._dict[old.id];
    }
  }

  get(id: string | number): Message {
    if (typeof id === 'number') {
      return this._cache[id];
    }
    return this._dict[id];
  }

  getLast(): Message {
    return this._cache[this._cache.length];
  }

  submit(message: Message): void | Message {
    // if we got the 'u' event first, this message was already published
    // get pending ID
    var new_id = <string>this._pending[message.id];
    // if we get the 'b' event before the 'u' event, add message to pending
    if (new_id === void 0) {
      // if ID wasn't pending, add message to pending
      this._pending[message.id] = message;
      return void 0;
    }

    // add to cache
    this._push(message, new_id);

    return message;
  }

  publish(id: string, new_id: string): void | Message {
    // if we got the 'b' event first, this message ID was already published
    // get pending message
    var message = <Message>this._pending[id];
    // if we get the 'u' event before the 'b' event, add ID to pending
    if (message === void 0) {
      // if message wasn't pending, add ID to pending
      this._pending[id] = new_id;
      return void 0;
    }

    // add to cache
    this._push(message, new_id);
    return message;
  }

  remove(id: string): void | Message {
    var message = this._dict[id];
    if (message === void 0) {
      return void 0;
    }
    delete this._dict[id];
    this._cache.splice(this._cache.indexOf(message), 1);

    return message;
  }
}

export default Message;
