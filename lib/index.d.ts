export * from './Room';
export * from './User';
export * from './Message';
import Room from './Room';
export declare function joinRoom(roomname: string, username?: string, password?: string): Room;
