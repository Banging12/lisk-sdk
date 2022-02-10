"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_KEY_LENGTH = exports.NODE_HASH_SIZE = exports.BRANCH_HASH_PREFIX = exports.LEAF_HASH_PREFIX = exports.EMPTY_HASH = exports.EMPTY_VALUE = void 0;
const lisk_cryptography_1 = require("@liskhq/lisk-cryptography");
exports.EMPTY_VALUE = Buffer.alloc(0);
exports.EMPTY_HASH = lisk_cryptography_1.hash(exports.EMPTY_VALUE);
exports.LEAF_HASH_PREFIX = Buffer.from('00', 'hex');
exports.BRANCH_HASH_PREFIX = Buffer.from('01', 'hex');
exports.NODE_HASH_SIZE = 32;
exports.DEFAULT_KEY_LENGTH = 38;
//# sourceMappingURL=constants.js.map