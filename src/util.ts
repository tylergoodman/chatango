// until node versions with native Set are in the majority...
export class Set<T> {
  private _elements: T[] = [];
  get length(): number {
    return this._elements.length;
  }

  constructor(initial?: T[]) {
    if (initial !== void 0) {
      for (var i = 0, len = initial.length; i < len; i++) {
        this.add(initial[i]);
      }
    }
  }

  add(element: T): Set<T> {
    // don't want falsy values
    if (!element) {
      return this;
    }
    if (!this.has(element)) {
      this._elements.push(element);
    }
    return this;
  }

  clear(): void {
    this._elements.length = 0;
  }

  delete(element: T): boolean {
    var index: number = this._elements.indexOf(element);
    if (index === -1) {
      return false;
    }
    this._elements.splice(index, 1);
    return true;
  }

  has(element: T): boolean {
    return this._elements.indexOf(element) !== -1;
  }

  toString(): string {
    return this._elements.toString();
  }
}