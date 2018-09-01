
export default function tryCatch(fn: Function, handler: Function) {
  try {
    fn();
  }
  catch (err) {
    handler(err);
  }
}
