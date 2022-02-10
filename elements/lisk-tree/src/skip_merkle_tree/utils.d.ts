/// <reference types="node" />
import { Query, Proof } from './types';
export declare const isLeaf: (value: Buffer) => boolean;
declare type QueryWithHeightAndBinaryKey = {
    binaryKey: string;
    value: Buffer;
    binaryBitmap: string;
    siblingHashes: Buffer[];
    height: number;
};
export declare const treeSort: (a: QueryWithHeightAndBinaryKey, b: QueryWithHeightAndBinaryKey) => number;
export declare const getOverlappingStr: (str1: string, str2: string) => string;
export declare const verify: (queryKeys: Buffer[], proof: Proof, merkleRoot: Buffer, keyLength: number) => boolean;
export declare const sortByBitmapAndKey: <T extends {
    key: Buffer;
    binaryBitmap: string;
}>(queries: T[]) => T[];
export declare const filterQueries: <T extends {
    key: Buffer;
    binaryBitmap: string;
}>(queries: T[], keyLength: number) => T[];
export declare const areSiblingQueries: (q1: {
    key: Buffer;
    binaryBitmap: string;
}, q2: {
    key: Buffer;
    binaryBitmap: string;
}, keyLength: number) => boolean;
export declare const calculateRoot: (sibHashes: Buffer[], queries: Query[], keyLength: number) => Buffer;
export declare const binaryExpansion: (k: Buffer, keyLengthInBytes: number) => string;
export declare const bufferToBinaryString: (buf: Buffer) => string;
export declare const binaryStringToBuffer: (str: string) => Buffer;
export declare const parseLeafData: (data: Buffer, keyLength: number) => {
    key: Buffer;
    value: Buffer;
};
export declare const parseBranchData: (data: Buffer) => {
    leftHash: Buffer;
    rightHash: Buffer;
};
export declare const leafData: (key: Buffer, value: Buffer) => Buffer;
export declare const branchData: (leftHash: Buffer, rightHash: Buffer) => Buffer;
export {};
