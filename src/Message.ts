/// <reference path="../typings/lodash/lodash.d.ts" />

import _ = require('lodash');

import User = require('./User');

class Message implements Message.Style {
  id: string;
  room: string;
  user: User;
  body: string;

  stylesOn: boolean;
  fontFamily: number;
  fontSize: number;
  usebackground: number;
  textColor: string;
  nameColor: string;
  bold: boolean;
  italics: boolean;
  underline: boolean;

  constructor() {
    
  }

  static tokens = {
    MESSAGE_PARSE: /^(?:<n(?:(?:\d{4})|((?:[a-fA-F0-9]{3}){1,2}))?\/>)?(?:<f x(\d{2})?((?:[a-fA-F0-9]{3}){1,2})?\=\"(\d+)?\">)?(.+)$/
  }

  static parse(raw: string): Message {
    var ret = new Message;

    var [
      input,
      nameColor,
      fontSize,
      textColor,
      fontFamily,
      body
    ] = raw.match(Message.tokens.MESSAGE_PARSE);

    if (nameColor)
      ret.nameColor = nameColor;
    if (fontSize)
      ret.fontSize = parseInt(fontSize, 10);
    if (textColor)
      ret.textColor = textColor;
    if (fontFamily)
      ret.fontFamily = parseInt(fontFamily, 10);

    body = body.replace(/<br\/>/g, '\n');
    body = body.replace(/<.+?\/>/, ''); // not sure if necessary
    body = _.unescape(body);
    ret.body = body;

    return ret;
  }
}

Message.prototype.stylesOn = false;
Message.prototype.fontFamily = 0;
Message.prototype.fontSize = 11;
Message.prototype.usebackground = 0;
Message.prototype.textColor = '';
Message.prototype.nameColor = '';
Message.prototype.bold = false;
Message.prototype.italics = false;
Message.prototype.underline = false;


module Message {
  export interface Style {
//    [index: string]: any;
    /**
     * whether these styles are shown or not
     */
    stylesOn?: boolean;
    /**
     * [0..8], the enumerated font face list
     */
    fontFamily?: number;
    /**
     * [9..22], font size
     */
    fontSize?: number;
    /**
     * [0, 1], whether to display the background data
     */
    usebackground?: number;
    /**
     * [000000..ffffff], hex code for font color
     */
    textColor?: string;
    /**
     * [000000..ffffff], hex code for name color
     */
    nameColor?: string;

    bold?: boolean;
    italics?: boolean;
    underline?: boolean;
  }

  export interface Background {
    /**
     * [tl, tr, bl, br], positioning of image
     */
    align?: string;
    /**
     * [0..100], alpha of the image
     */
    ialp?: number;
    /**
     * [0, 1], whether to tile
     */
    tile?: number;
    /**
     * [0..100], alpha of the color
     */

    bgalp?: number;
    /**
     * [000000..ffffff], hex code for background color
     */
    bgc?: string;
    /**
     * [0, 1], whether to use image
     */
    useimg?: number;

    // ??
    /**
     * [0, 1]
     */
    hasrec?: number;
    /**
     * [0, 1]
     */
    isvid?: number;
  }

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
}

export = Message;