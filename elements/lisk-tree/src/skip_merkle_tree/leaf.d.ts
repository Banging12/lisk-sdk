/// <reference types="node" />
export declare class Leaf {
    private readonly _key;
    private _value;
    private _hash;
    private _data;
    constructor(key: Buffer, value: Buffer);
    get hash(): Buffer;
    get key(): Buffer;
    get value(): Buffer;
    get data(): Buffer;
    update(newValue: Buffer): void;
}
