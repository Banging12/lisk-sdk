"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Branch = void 0;
const lisk_cryptography_1 = require("@liskhq/lisk-cryptography");
const utils_1 = require("./utils");
class Branch {
    constructor(leftHash, rightHash) {
        this._leftHash = leftHash;
        this._rightHash = rightHash;
        this._data = utils_1.branchData(this._leftHash, this._rightHash);
        this._hash = lisk_cryptography_1.hash(this._data);
    }
    get hash() {
        return this._hash;
    }
    get data() {
        return this._data;
    }
    get leftHash() {
        return this._leftHash;
    }
    get rightHash() {
        return this._rightHash;
    }
    update(newChild, nodeSide) {
        if (nodeSide === 0) {
            this._leftHash = newChild;
        }
        else {
            this._rightHash = newChild;
        }
        this._data = utils_1.branchData(this.leftHash, this.rightHash);
        this._hash = lisk_cryptography_1.hash(this.data);
    }
}
exports.Branch = Branch;
//# sourceMappingURL=branch.js.map