/// <reference types="node" />
export declare class SubTree {
    private _data;
    private _structure;
    constructor(data: Buffer[], structure: Buffer);
    get data(): Buffer[];
    get structure(): Buffer;
    update(key: Buffer, value: Buffer): void;
}
