"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.branchData = exports.leafData = exports.parseBranchData = exports.parseLeafData = exports.binaryStringToBuffer = exports.bufferToBinaryString = exports.binaryExpansion = exports.calculateRoot = exports.areSiblingQueries = exports.filterQueries = exports.sortByBitmapAndKey = exports.verify = exports.getOverlappingStr = exports.treeSort = exports.isLeaf = void 0;
const lisk_cryptography_1 = require("@liskhq/lisk-cryptography");
const lisk_utils_1 = require("@liskhq/lisk-utils");
const constants_1 = require("./constants");
const isLeaf = (value) => value[0] === constants_1.LEAF_HASH_PREFIX[0];
exports.isLeaf = isLeaf;
const treeSort = (a, b) => {
    if (b.height === a.height) {
        if (parseInt(a.binaryKey, 2) < parseInt(b.binaryKey, 2)) {
            return -1;
        }
        return 1;
    }
    return b.height - a.height;
};
exports.treeSort = treeSort;
const getOverlappingStr = (str1, str2) => {
    const output = [''];
    for (let i = 0; i < str1.length; i += 1) {
        if (str1[i] !== str2[i]) {
            return output.join('');
        }
        output.push(str1[i]);
    }
    return output.join('');
};
exports.getOverlappingStr = getOverlappingStr;
const verify = (queryKeys, proof, merkleRoot, keyLength) => {
    if (queryKeys.length !== proof.queries.length) {
        return false;
    }
    for (const [index, q] of proof.queries.entries()) {
        const k = queryKeys[index];
        if (k.equals(q.key)) {
            continue;
        }
        const binaryResponseBitmap = exports.bufferToBinaryString(q.bitmap);
        const binaryResponseKey = exports.binaryExpansion(q.key, keyLength);
        const binaryQueryKey = exports.binaryExpansion(k, keyLength);
        const sharedPrefix = exports.getOverlappingStr(binaryResponseKey, binaryQueryKey);
        if (binaryResponseBitmap.length > sharedPrefix.length) {
            return false;
        }
    }
    return exports.calculateRoot(proof.siblingHashes, proof.queries, keyLength).equals(merkleRoot);
};
exports.verify = verify;
const sortByBitmapAndKey = (queries) => queries.sort((q1, q2) => {
    if (q1.binaryBitmap.length === q2.binaryBitmap.length) {
        if (q1.key.byteLength === q2.key.byteLength) {
            return Buffer.compare(q1.key, q2.key);
        }
        return q1.key.byteLength - q2.key.byteLength;
    }
    return q2.binaryBitmap.length - q1.binaryBitmap.length;
});
exports.sortByBitmapAndKey = sortByBitmapAndKey;
const filterQueries = (queries, keyLength) => {
    const uniqueKeys = [];
    return queries.filter(q => {
        const h = q.binaryBitmap.length;
        const binaryKey = exports.binaryExpansion(q.key, keyLength);
        const keyPrefix = binaryKey.substring(0, h);
        if (!uniqueKeys.includes(keyPrefix)) {
            uniqueKeys.push(keyPrefix);
            return true;
        }
        return false;
    });
};
exports.filterQueries = filterQueries;
const areSiblingQueries = (q1, q2, keyLength) => {
    if (q1.binaryBitmap.length !== q2.binaryBitmap.length) {
        return false;
    }
    const h = q1.binaryBitmap.length - 1;
    const binaryKey1 = exports.binaryExpansion(q1.key, keyLength);
    const binaryKey2 = exports.binaryExpansion(q2.key, keyLength);
    const keyPrefix1 = binaryKey1.substring(0, h);
    const keyPrefix2 = binaryKey2.substring(0, h);
    if (keyPrefix1 !== keyPrefix2) {
        return false;
    }
    const d1 = binaryKey1[h];
    const d2 = binaryKey2[h];
    return (d1 === '0' && d2 === '1') || (d1 === '1' && d2 === '0');
};
exports.areSiblingQueries = areSiblingQueries;
const calculateRoot = (sibHashes, queries, keyLength) => {
    const siblingHashes = lisk_utils_1.objects.cloneDeep(sibHashes);
    const data = [];
    for (const q of queries) {
        data.push({
            key: q.key,
            value: q.value,
            binaryBitmap: exports.bufferToBinaryString(q.bitmap),
            hash: q.value.byteLength === 0 ? constants_1.EMPTY_HASH : lisk_cryptography_1.hash(exports.leafData(q.key, q.value)),
        });
    }
    let sortedQueries = exports.filterQueries(exports.sortByBitmapAndKey(data), keyLength);
    while (sortedQueries.length > 0) {
        const q = sortedQueries[0];
        if (q.binaryBitmap === '') {
            return q.hash;
        }
        const b = q.binaryBitmap[0];
        const h = q.binaryBitmap.length;
        const binaryKey = exports.binaryExpansion(q.key, keyLength);
        let siblingHash;
        if (sortedQueries.length > 1 && exports.areSiblingQueries(q, sortedQueries[1], keyLength)) {
            siblingHash = sortedQueries[1].hash;
            sortedQueries.splice(1, 1);
        }
        else if (b === '0') {
            siblingHash = constants_1.EMPTY_HASH;
        }
        else if (b === '1') {
            siblingHash = siblingHashes[0];
            siblingHashes.splice(0, 1);
        }
        const d = binaryKey[h - 1];
        if (d === '0') {
            q.hash = lisk_cryptography_1.hash(exports.branchData(q.hash, siblingHash));
        }
        else if (d === '1') {
            q.hash = lisk_cryptography_1.hash(exports.branchData(siblingHash, q.hash));
        }
        q.binaryBitmap = q.binaryBitmap.substring(1);
        sortedQueries = exports.filterQueries(exports.sortByBitmapAndKey(sortedQueries), keyLength);
    }
    throw new Error('Can not calculate root hash');
};
exports.calculateRoot = calculateRoot;
const binaryExpansion = (k, keyLengthInBytes) => exports.bufferToBinaryString(k).padStart(8 * keyLengthInBytes, '0');
exports.binaryExpansion = binaryExpansion;
const bufferToBinaryString = (buf) => {
    let result = '';
    for (let i = 0; i < buf.byteLength; i += 1) {
        const byteBin = buf.readUInt8(i).toString(2);
        result += i === 0 ? byteBin : byteBin.padStart(8, '0');
    }
    return result;
};
exports.bufferToBinaryString = bufferToBinaryString;
const binaryStringToBuffer = (str) => {
    const byteSize = Math.ceil(str.length / 8);
    const buf = Buffer.alloc(byteSize);
    for (let i = 1; i <= byteSize; i += 1) {
        buf.writeUInt8(parseInt(str.substring(str.length - i * 8, str.length - i * 8 + 8), 2), byteSize - i);
    }
    return buf;
};
exports.binaryStringToBuffer = binaryStringToBuffer;
const parseLeafData = (data, keyLength) => {
    const key = data.slice(1, keyLength + 1);
    const value = data.slice(keyLength + 1, data.length);
    return {
        key,
        value,
    };
};
exports.parseLeafData = parseLeafData;
const parseBranchData = (data) => {
    const leftHash = data.slice(-2 * constants_1.NODE_HASH_SIZE, -1 * constants_1.NODE_HASH_SIZE);
    const rightHash = data.slice(-1 * constants_1.NODE_HASH_SIZE);
    return {
        leftHash,
        rightHash,
    };
};
exports.parseBranchData = parseBranchData;
const leafData = (key, value) => Buffer.concat([constants_1.LEAF_HASH_PREFIX, key, value]);
exports.leafData = leafData;
const branchData = (leftHash, rightHash) => Buffer.concat([constants_1.BRANCH_HASH_PREFIX, leftHash, rightHash]);
exports.branchData = branchData;
//# sourceMappingURL=utils.js.map