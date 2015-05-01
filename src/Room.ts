import User = require('./User');
import Connection = require('./Connection');

class Room {
  name: string;
  users: User[];
  connection: Connection;
}

export = Room;