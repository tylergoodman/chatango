import * as xml2js from 'xml2js';


const parseXML = <T = any>(xml: string): Promise<T> => {
  return new Promise((resolve, reject) => {
    try {
      xml2js.parseString(xml, (err: any, result: T) => {
        if (err) {
          return reject(err);
        }
        resolve(result);
      });
    }
    catch (err) {
      reject(err);
    }
  });
};

export default parseXML;
