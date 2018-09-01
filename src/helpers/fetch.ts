import fetch from 'node-fetch';


const fetchIntercept = (url: string, opts: RequestInit = {}) => {
  return fetch(url, {
    ...opts,
    headers: {
      'User-Agent': 'ChatangoJS',
      ...opts.headers,
    },
  } as RequestInit);
};

export default fetchIntercept;
