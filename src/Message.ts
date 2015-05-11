class Message {
  
}

module Message {
  export interface Style {
    /**
     * [000000..ffffff] hex code of name color
     */
    name?: string;
    font?: {
      /**
       * [000000..ffffff] hex code of font color
       */
      color: string;
      /**
       * [9..22], font size
       */
      size: number;
      face: Message.Font;

      bold: boolean;
      italics: boolean;
      underline: boolean;
    };
    background?: Background;
  }

  export interface StyleAPIGet {
    /**
     * whether these styles are shown or not
     */
    stylesOn: boolean;
    /**
     * [0..8], the enumerated font face list
     */
    fontFamily: string;
    /**
     * [9..22], font size
     */
    fontSize: string;
    /**
     * [0, 1], whether to display the background data
     */
    usebackground: number;
    /**
     * [000000..ffffff], hex code for font color
     */
    textColor: string;
    /**
     * [000000..ffffff], hex code for name color
     */
    nameColor: string;

    bold: boolean;
    italics: boolean;
    underline: boolean;
  }

  export interface Background {
    /**
     * [tl, tr, bl, br], positioning of image
     */
    align: string;
    /**
     * [0..100], alpha of the image
     */
    ialp: number;
    /**
     * [0, 1], whether to tile
     */
    tile: number;
    /**
     * [0..100], alpha of the color
     */

    bgalp: number;
    /**
     * [000000..ffffff], hex code for background color
     */
    bgc: string;
    /**
     * [0, 1], whether to use image
     */
    useimg: number;

    // ??
    /**
     * [0, 1]
     */
    hasrec: number;
    /**
     * [0, 1]
     */
    isvid: number;
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