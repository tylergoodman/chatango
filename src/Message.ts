/// <reference path="../typings/tsd.d.ts" />

import _ = require('lodash');

import User = require('./User');

module Message {
  export class Message {
    id: string;
    room: string;
    user: User;
    body: string;
    style: Style = new Style;

    constructor() {
      
    }
  }

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


  export var tokens = {
    MESSAGE_PARSE: /^(?:<n(?:(?:\d{4})|((?:[a-fA-F0-9]{3}){1,2}))?\/>)?(?:<f x(\d{2})?((?:[a-fA-F0-9]{3}){1,2})?\=\"(\d+)?\">)?(.+)$/,
    FORMAT: /(?:<([biu])>)(.+?)<\/\1>/
  }

  export function parse(raw: string): Message {
    var ret = new Message;

    var [
      input,
      nameColor,
      fontSize,
      textColor,
      fontFamily,
      body
    ] = raw.match(tokens.MESSAGE_PARSE);

    if (nameColor)
      ret.style.nameColor = nameColor;
    if (fontSize)
      ret.style.fontSize = parseInt(fontSize, 10);
    if (textColor)
      ret.style.textColor = textColor;
    if (fontFamily)
      ret.style.fontFamily = parseInt(fontFamily, 10);

    body = body.replace(/<br\/>/g, '\n');

    var format: RegExpMatchArray;
    while (format = body.match(tokens.FORMAT)) {
      switch (format[1]) {
        case 'b':
          ret.style.bold = true;
          break;
        case 'i':
          ret.style.italics = true;
          break;
        case 'u':
          ret.style.underline = true;
          break;
      }
      body = format[2];
    }

    body = _.unescape(body);
    ret.body = body;

    return ret;
  }
}

export = Message;