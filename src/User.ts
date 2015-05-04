

class User {
  username: string;
  password: string;
  type: User.types;

//  static enum types {
//    Anonymous,
//    Temporary,
//    Registered,
//  }

  get info() {
    return this.password;
  }

  constructor(username: string = '', password: string = '') {
    this.username = username;
    this.password = password;

    if (!username && !password) {
      this.type = User.types.Anonymous;
    }
    else if (!password) {
      this.type = User.types.Temporary;
    }
    else {
      this.type = User.types.Registered;
    }
  }

}

// typescript pls
module User {
  export enum types {
    Anonymous,
    Temporary,
    Registered,
  }
}

export = User;