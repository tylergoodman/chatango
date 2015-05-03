
enum UserType {
  Anonymous,
  Temporary,
  Registered,
}

class User {
  username: string = '';
  password: string = '';
  type: UserType = User.types.Anonymous;

  static types = UserType;

  get info() {
    return this.password;
  }

  constructor(username?: string, password?: string) {
    
    if (!username && !password) {
      this.type = UserType.Anonymous;
    }
    else if (!password) {
      this.type = UserType.Temporary;
    }
    else {
      this.type = UserType.Registered;
    }
  }

}

export = User;