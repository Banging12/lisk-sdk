/// <reference types="node" />
import { NodeSide } from './constants';
export declare class Branch {
    private _leftHash;
    private _rightHash;
    private _hash;
    private _data;
    constructor(leftHash: Buffer, rightHash: Buffer);
    get hash(): Buffer;
    get data(): Buffer;
    get leftHash(): Buffer;
    get rightHash(): Buffer;
    update(newChild: Buffer, nodeSide: NodeSide): void;
}
