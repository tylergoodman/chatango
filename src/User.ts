
class User {
  username: string;
  password: string;
  get info() {
    return this.password;
  }
}

export = User;