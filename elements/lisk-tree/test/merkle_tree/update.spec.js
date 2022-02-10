'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const merkle_tree_1 = require('../../src/merkle_tree/merkle_tree');
const fixtures = require('../fixtures/merkle_tree/update_leaves_fixtures.json');
describe('update', () => {
	for (const test of fixtures.testCases) {
		it(test.description, async () => {
			const tree = new merkle_tree_1.MerkleTree();
			await tree.init(test.input.values.map(v => Buffer.from(v, 'hex')));
			const updateData = test.input.updateValues.map(d => Buffer.from(d, 'hex'));
			const idxs = test.input.proof.indexes.map(hexString => Number(`0x${hexString}`));
			const nextRoot = await tree.update(idxs, updateData);
			expect(nextRoot).toEqual(Buffer.from(test.output.finalMerkleRoot, 'hex'));
		});
	}
});
//# sourceMappingURL=update.spec.js.map
