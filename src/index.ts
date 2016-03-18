export * from './Room';
export * from './User';
export * from './Message';

import Room from './Room';
import User from './User';

export function joinRoom (roomname: string, username?: string, password?: string): Room {
  let ret: Room;
  if (username && password) {
    ret = new Room(roomname, User.login(username, password));
  }
  else if (username) {
    ret = new Room(roomname, new User(username));
  }
  else {
    ret = new Room(roomname);
  }
  ret.connect();
  return ret;
}
