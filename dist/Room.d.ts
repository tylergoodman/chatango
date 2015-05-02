/// <reference path="../typings/lodash.d.ts" />
import User = require('./User');
import Connection = require('./Connection');
declare class Room {
    name: string;
    user: User;
    users: User[];
    connection: Connection;
    constructor(name: string, user: User);
    private getServer(room_name);
}
export = Room;
