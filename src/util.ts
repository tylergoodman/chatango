// until node versions with native Set are in the majority...
export class Set<T> {
  elements: T[] = [];
  get length(): number {
    return this.elements.length;
  }

  constructor(initial?: T[]) {
    if (initial !== void 0) {
      for (var i = 0, len = initial.length; i < len; i++) {
        this.add(initial[i]);
      }
    }
  }

  add(element: T): Set<T> {
    if (!this.has(element)) {
      this.elements.push(element);
    }
    return this;
  }

  clear(): void {
    this.elements.length = 0;
  }

  delete(element: T): boolean {
    var index: number = this.elements.indexOf(element);
    if (index === -1) {
      return false;
    }
    this.elements.splice(index, 1);
    return true;
  }

  has(element: T): boolean {
    return this.elements.indexOf(element) !== -1;
  }

  toString(): string {
    return this.elements.toString();
  }
}