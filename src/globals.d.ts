
declare namespace ChatangoAPI {
  export interface Style {
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
  export interface Background {
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
}


declare interface ObjectConstructor {
  values: (obj: Object) => any[];
}

declare module 'node-fetch' {
  export interface Headers {
    raw<T>(): T;
    raw(): { [index: string]: string };
  }
}
