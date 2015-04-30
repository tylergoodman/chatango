/// <reference path="node.d.ts" />
import events = require('events');

export class Connection extends events.EventEmitter {
  constructor() {
    super();
  }
}