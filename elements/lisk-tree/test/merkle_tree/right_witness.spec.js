'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const fixture = require('../fixtures/transaction_merkle_root/transaction_merkle_root.json');
const merkle_tree_1 = require('../../src/merkle_tree/merkle_tree');
const right_witness_1 = require('../../src/merkle_tree/right_witness');
describe('Merkle tree - right witness', () => {
	describe('right witness generation and verification', () => {
		for (const test of fixture.testCases) {
			describe(test.description, () => {
				const fullTree = new merkle_tree_1.MerkleTree();
				const inputs = test.input.transactionIds.map(hexString => Buffer.from(hexString, 'hex'));
				beforeAll(async () => {
					await fullTree.init(inputs);
				});
				it('should generate valid right witness', async () => {
					for (let i = 0; i < fullTree.size; i += 1) {
						const witness = await fullTree.generateRightWitness(i);
						const partialMerkleTree = new merkle_tree_1.MerkleTree();
						await partialMerkleTree.init(inputs.slice(0, i));
						const appendPath = await partialMerkleTree['_getAppendPathHashes']();
						expect(
							right_witness_1.verifyRightWitness(i, appendPath, witness, fullTree.root),
						).toBeTrue();
					}
				});
			});
		}
	});
});
//# sourceMappingURL=right_witness.spec.js.map
