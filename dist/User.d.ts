declare class User {
    username: string;
    password: string;
    type: User.types;
    info: string;
    constructor(username?: string, password?: string);
}
declare module User {
    enum types {
        Anonymous = 0,
        Temporary = 1,
        Registered = 2,
    }
}
export = User;
