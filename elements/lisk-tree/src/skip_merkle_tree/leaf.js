"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Leaf = void 0;
const lisk_cryptography_1 = require("@liskhq/lisk-cryptography");
const utils_1 = require("./utils");
class Leaf {
    constructor(key, value) {
        this._key = key;
        this._value = value;
        this._data = utils_1.leafData(this._key, this._value);
        this._hash = lisk_cryptography_1.hash(this._data);
    }
    get hash() {
        return this._hash;
    }
    get key() {
        return this._key;
    }
    get value() {
        return this._value;
    }
    get data() {
        return this._data;
    }
    update(newValue) {
        this._value = newValue;
        this._data = utils_1.leafData(this._key, this._value);
        this._hash = lisk_cryptography_1.hash(this._data);
    }
}
exports.Leaf = Leaf;
//# sourceMappingURL=leaf.js.map