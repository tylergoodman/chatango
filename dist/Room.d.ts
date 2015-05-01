import User = require('./User');
import Connection = require('./Connection');
declare class Room {
    name: string;
    users: User[];
    connection: Connection;
}
export = Room;
