
const requiresUserAuth = (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
  if (!descriptor) {
    descriptor = Object.getOwnPropertyDescriptor(target, propertyKey);
  }
  var originalMethod = descriptor.value;

  descriptor.value = async function () {
    if (!this._auth) {
      await this._getToken();
    }
    return originalMethod(...arguments);
  };
};

export default requiresUserAuth;
