/// <reference types="node" />
export interface Proof {
    readonly siblingHashes: Buffer[];
    readonly queries: Query[];
}
export interface Query {
    readonly key: Buffer;
    readonly value: Buffer;
    readonly bitmap: Buffer;
}
export interface Database {
    get(key: Buffer): Promise<Buffer>;
    set(key: Buffer, value: Buffer): Promise<void>;
    del(key: Buffer): Promise<void>;
}
