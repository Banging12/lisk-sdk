'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const calculate_1 = require('../../src/merkle_tree/calculate');
const fixtures = require('../fixtures/merkle_tree/update_leaves_fixtures.json');
describe('calculateRootFromUpdateData', () => {
	for (const test of fixtures.testCases) {
		it(test.description, () => {
			const proof = {
				indexes: test.input.proof.indexes.map(hexString => Number(`0x${hexString}`)),
				size: Number(test.input.proof.size),
				siblingHashes: test.input.proof.siblingHashes.map(h => Buffer.from(h, 'hex')),
			};
			const updateData = test.input.updateValues.map(d => Buffer.from(d, 'hex'));
			const root = calculate_1.calculateRootFromUpdateData(updateData, proof);
			expect(root).toEqual(Buffer.from(test.output.finalMerkleRoot, 'hex'));
		});
	}
});
//# sourceMappingURL=calculate_root_from_update_data.spec.js.map
