'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const fixture = require('../fixtures/transaction_merkle_root/transaction_merkle_root.json');
const merkle_tree_1 = require('../../src/merkle_tree/merkle_tree');
const utils_1 = require('../../src/merkle_tree/utils');
describe('utils', () => {
	describe('calculateMerkleRoot', () => {
		describe('should generate correct merkle root info', () => {
			for (const test of fixture.testCases.slice(1)) {
				describe(test.description, () => {
					const fullTree = new merkle_tree_1.MerkleTree();
					const partialTree = new merkle_tree_1.MerkleTree();
					const transactionIds = test.input.transactionIds.map(hexString =>
						Buffer.from(hexString, 'hex'),
					);
					let valueToAppend;
					beforeAll(async () => {
						await fullTree.init(transactionIds);
						valueToAppend = transactionIds.pop();
						await partialTree.init(transactionIds);
					});
					it('should return correct merkle root, appendPath and size', async () => {
						const previousAppendPath = await partialTree['_getAppendPathHashes']();
						const previousSize = partialTree.size;
						const { root, appendPath, size } = utils_1.calculateMerkleRoot({
							value: valueToAppend,
							appendPath: previousAppendPath,
							size: previousSize,
						});
						expect(root).toEqual(fullTree.root);
						expect(appendPath).toEqual(await fullTree['_getAppendPathHashes']());
						expect(size).toEqual(fullTree.size);
					});
				});
			}
		});
	});
	describe('calculateMerkleRootWithLeaves', () => {
		describe('should generate correct merkle root info', () => {
			for (const test of fixture.testCases) {
				describe(test.description, () => {
					const transactionIds = test.input.transactionIds.map(hexString =>
						Buffer.from(hexString, 'hex'),
					);
					it('should return correct merkle root', () => {
						expect(utils_1.calculateMerkleRootWithLeaves(transactionIds)).toEqual(
							Buffer.from(test.output.transactionMerkleRoot, 'hex'),
						);
					});
				});
			}
		});
	});
});
//# sourceMappingURL=utils.spec.js.map
