/// <reference path="../typings/tsd.d.ts" />

import _ = require('lodash');

import User = require('./User');
import Room = require('./Room');

/**
 * Message class
 */

class Message {
  id: string;
  user: string | User;
  user_id: User.ID;
  created_at: number;
  body: string;
  style: Message.Style = new Message.Style;

  room: Room;

  constructor() {}

  toString(): string {
    return `${this.user.toString()}: ${this.body}`;
  }

  static tokens = {
    MESSAGE_PARSE: /^(?:<n(?:(?:\d{4})|((?:[a-fA-F0-9]{3}){1,2}))?\/>)?(?:<f x(\d{2})?((?:[a-fA-F0-9]{3}){1,2})?\=\"(\d+)?\">)?(.+)$/,
    FORMAT: /(?:<([biu])>)(.+?)<\/\1>/
  }

  static parse(raw: string): Message {
    var message = new Message;

    var [
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

    var format: RegExpMatchArray;
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

    body = _.unescape(body);
    message.body = body;

    return message;
  }
}
Message.prototype.id = '';
Message.prototype.created_at = 0;
Message.prototype.body = '';
Message.prototype.user = '';

module Message {

  export class Style {
   [index: string]: any;
    /**
     * @param stylesOn: whether these styles are shown or not
     * @param fontFamily: [0..8], the enumerated font face list
     * @param fontSize: [9..22], font size
     * @param usebackground: [0, 1], whether to display the background data
     * @param textColor: [000000..ffffff], hex code for font color
     * @param nameColor: [000000..ffffff], hex code for name color
     */
    stylesOn: boolean;
    fontFamily: number;
    fontSize: number;
    usebackground: number;
    textColor: string;
    nameColor: string;

    bold: boolean;
    italics: boolean;
    underline: boolean;
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

  export class Background {
    /**
     * @param align: [tl, tr, bl, br], positioning of image
     * @param ialp: [0..100], alpha of the image
     * @param tile: [0, 1], whether to tile
     * @param bgalp: [0..100], alpha of the color
     * @param bgc: [000000..ffffff], hex code for background color
     * @param useimg: [0, 1], whether to use image
     * @param hasrec: [0, 1]
     * @param isvid: [0, 1]
     */
    align: string;
    ialp: number;
    tile: number;
    bgalp: number;
    bgc: string;
    useimg: number;

    hasrec: number;
    isvid: number;

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

  export class Cache {
    size: number;
    map: {[index: string]: string} = {};
    private _pending: {[index: string]: string | Message} = {};
    private _cache: Message[] = [];
    private _dict: {[index: string]: Message} = {};

    constructor(options?: Cache.Options) {
      _.extend(this, options);
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

    get(id: string): Message {
      return this._dict[id];
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
  Cache.prototype.size = 100;
  export module Cache {
    export interface Options {
      size: number;
    }
  }
}

export = Message;
