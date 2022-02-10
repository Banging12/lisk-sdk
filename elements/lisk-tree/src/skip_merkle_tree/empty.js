"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Empty = void 0;
const constants_1 = require("./constants");
class Empty {
    constructor() {
        this._hash = constants_1.EMPTY_HASH;
    }
    get hash() {
        return this._hash;
    }
}
exports.Empty = Empty;
//# sourceMappingURL=empty.js.map