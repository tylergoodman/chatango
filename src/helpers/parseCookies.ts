import { Headers } from 'node-fetch';

interface Cookie {
  name: string;
  value: string;
  expires?: Date;
  path?: string;
  domain?: string;
  httponly?: boolean;
}

const parseCookieString = (cookie: string): Cookie => {
  const [
    nameValue,
    ...parts
  ] = cookie.split(/;\s+?/);
  let [ name, value ] = nameValue.split('=');
  name = name.toLowerCase();
  value = decodeURIComponent(value);

  const partialCookie: Partial<Cookie> = parts.reduce((acc: {}, part: string) => {
    let name: string;
    let value: any;
    ([ name, value ] = part.split('='));
    name = name.toLowerCase();
    if (name === 'expires') {
      value = new Date(value);
    }
    if (!value) {
      value = true;
    }
    acc[name] = value;
    return acc;
  }, {});

  return {
    name,
    value,
    ...partialCookie,
  };
};

const parseCookies = (headers: Headers): Cookie[] => {
  const ret: Cookie[] = [];
  const cookies: string | string[] = headers.raw()['set-cookie'];
  if (typeof cookies === 'string') {
    const cookie = parseCookieString(cookies);
    ret.push(cookie);
  }
  else {
    cookies
      .map(parseCookieString)
      .forEach((cookie: Cookie) => {
        ret.push(cookie);
      })
      ;
  }
  return ret;
};

export default parseCookies;
