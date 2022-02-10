'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const merkle_tree_1 = require('../../src/merkle_tree/merkle_tree');
const fixtures = require('../fixtures/merkle_tree/update_leaves_fixtures.json');
describe('siblingHashes', () => {
	for (const test of fixtures.testCases) {
		it(test.description, async () => {
			const values = test.input.values.map(hexString => Buffer.from(hexString, 'hex'));
			const testSiblingHashes = test.input.proof.siblingHashes.map(hexString =>
				Buffer.from(hexString, 'hex'),
			);
			const indexes = test.input.proof.indexes.map(hexString => Number(`0x${hexString}`));
			const merkleTree = new merkle_tree_1.MerkleTree();
			await merkleTree.init(values);
			const siblingHashes = await merkleTree['_getSiblingHashes'](indexes);
			for (let i = 0; i < testSiblingHashes.length; i += 1) {
				const testSiblingHash = testSiblingHashes[i];
				const siblingHash = siblingHashes[i];
				expect(testSiblingHash.equals(siblingHash)).toBe(true);
			}
		});
	}
});
//# sourceMappingURL=get_sibling_hashes.spec.js.map
