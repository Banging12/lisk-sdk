'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const merkle_tree_1 = require('../../src/merkle_tree/merkle_tree');
const verify_proof_1 = require('../../src/merkle_tree/verify_proof');
const fixtures = require('../fixtures/merkle_tree/rmt-generate-verify-proof-fixtures.json');
describe('generate and verify proof', () => {
	describe('generate proof', () => {
		for (const test of fixtures.testCases) {
			it(test.description, async () => {
				const values = test.input.values.map(val => Buffer.from(val, 'hex'));
				const merkleTree = new merkle_tree_1.MerkleTree();
				await merkleTree.init(values);
				const queryHashes = test.input.queryHashes.map(v => Buffer.from(v, 'hex'));
				const generatedProof = await merkleTree.generateProof(queryHashes);
				expect(generatedProof.idxs).toEqual(test.output.proof.idxs.map(v => Number(`0x${v}`)));
				expect(generatedProof.size).toEqual(Number(test.output.proof.size));
				expect(generatedProof.siblingHashes).toEqual(
					test.output.proof.siblingHashes.map(v => Buffer.from(v, 'hex')),
				);
			});
		}
	});
	describe('verify proof', () => {
		for (const test of fixtures.testCases) {
			it(test.description, () => {
				const queryHashes = test.input.queryHashes.map(v => Buffer.from(v, 'hex'));
				const proof = {
					idxs: test.output.proof.idxs.map(v => Number(`0x${v}`)),
					siblingHashes: test.output.proof.siblingHashes.map(v => Buffer.from(v, 'hex')),
					size: Number(test.output.proof.size),
				};
				const root = Buffer.from(test.output.merkleRoot, 'hex');
				expect(verify_proof_1.verifyProof(queryHashes, proof, root)).toBeTrue();
			});
		}
	});
});
//# sourceMappingURL=generate_proof.spec.js.map
