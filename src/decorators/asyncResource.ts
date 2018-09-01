

interface AsyncResourceOptionsObject<T> {
  fetch: () => Promise<T>;
  lifetime: number;
}
type PromiseFunctionOf<T> = () => Promise<T>;
type AsyncResourceOptions<T> = AsyncResourceOptionsObject<T> | PromiseFunctionOf<T>;

const asyncResource = <T>(opts: AsyncResourceOptions<T>) => (target: Object, propertyKey: string) => {
  let fetch: PromiseFunctionOf<T>;
  let lifetime: number;
  let fetched_at: number = -Infinity;
  let value: T = this[propertyKey];
  if (typeof opts === 'function') {
    fetch = opts;
  }
  else {
    ({ fetch, lifetime } = opts);
  }
  if (lifetime === undefined) {
    lifetime = -Infinity;
  }
  Object.defineProperty(target, propertyKey, {
    async get(): Promise<T> {
      if (Date.now() - fetched_at > lifetime) {
        value = await fetch.call(this);
        fetched_at = Date.now();
      }
      return value;
    },
    set(value: T) {
      return value = value;
    }
  });
};

export default asyncResource;
