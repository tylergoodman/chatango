export declare class Set<T> {
    private _elements;
    length: number;
    constructor(initial?: T[]);
    add(element: T): Set<T>;
    clear(): void;
    delete(element: T): boolean;
    has(element: T): boolean;
    toString(): string;
}
