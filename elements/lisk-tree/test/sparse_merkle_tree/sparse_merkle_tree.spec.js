'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const inmemory_db_1 = require('../../src/inmemory_db');
const sparse_merkle_tree_1 = require('../../src/sparse_merkle_tree/sparse_merkle_tree');
const utils_1 = require('../../src/sparse_merkle_tree/utils');
const fixtures = require('../fixtures/sparse_merkle_tree/update_tree.json');
const SMTFixtures = require('../fixtures/sparse_merkle_tree/smt_fixtures.json');
const ProofFixtures = require('../fixtures/sparse_merkle_tree/smt_proof_fixtures.json');
const removeTreeFixtures = require('../fixtures/sparse_merkle_tree/remove_tree.json');
const removeExtraTreeFixtures = require('../fixtures/sparse_merkle_tree/remove_extra_tree.json');
const JumboFixtures = require('../fixtures/sparse_merkle_tree/smt_jumbo_fixtures.json');
describe('SparseMerkleTree', () => {
	describe('constructor', () => {});
	describe('update', () => {
		let db;
		let smt;
		beforeEach(() => {
			db = new inmemory_db_1.InMemoryDB();
			smt = new sparse_merkle_tree_1.SparseMerkleTree({ db, keyLength: 32 });
		});
		for (const test of fixtures.testCases) {
			it(test.description, async () => {
				const inputKeys = test.input.keys;
				const inputValues = test.input.values;
				const outputMerkleRoot = test.output.merkleRoot;
				for (let i = 0; i < inputKeys.length; i += 1) {
					await smt.update(Buffer.from(inputKeys[i], 'hex'), Buffer.from(inputValues[i], 'hex'));
				}
				expect(smt.rootHash.toString('hex')).toEqual(outputMerkleRoot);
			});
		}
		for (const test of SMTFixtures.testCases) {
			it(test.description, async () => {
				const inputKeys = test.input.keys;
				const inputValues = test.input.values;
				const outputMerkleRoot = test.output.merkleRoot;
				for (let i = 0; i < inputKeys.length; i += 1) {
					await smt.update(Buffer.from(inputKeys[i], 'hex'), Buffer.from(inputValues[i], 'hex'));
				}
				expect(smt.rootHash.toString('hex')).toEqual(outputMerkleRoot);
			});
		}
	});
	describe('remove', () => {
		let db;
		let smt;
		beforeEach(() => {
			db = new inmemory_db_1.InMemoryDB();
			smt = new sparse_merkle_tree_1.SparseMerkleTree({ db, keyLength: 32 });
		});
		for (const test of removeTreeFixtures.testCases) {
			it(test.description, async () => {
				const { keys, values, deleteKeys } = test.input;
				for (let i = 0; i < keys.length; i += 1) {
					await smt.update(Buffer.from(keys[i], 'hex'), Buffer.from(values[i], 'hex'));
				}
				for (const key of deleteKeys) {
					await smt.remove(Buffer.from(key, 'hex'));
				}
				expect(smt.rootHash.toString('hex')).toEqual(test.output.merkleRoot);
			});
		}
		for (const test of removeExtraTreeFixtures.testCases) {
			it(test.description, async () => {
				const { keys, values, deleteKeys } = test.input;
				for (let i = 0; i < keys.length; i += 1) {
					await smt.update(Buffer.from(keys[i], 'hex'), Buffer.from(values[i], 'hex'));
				}
				for (const key of deleteKeys) {
					await smt.remove(Buffer.from(key, 'hex'));
				}
				expect(smt.rootHash.toString('hex')).toEqual(test.output.merkleRoot);
			});
		}
	});
	describe('generateMultiProof', () => {
		let db;
		let smt;
		beforeEach(() => {
			db = new inmemory_db_1.InMemoryDB();
			smt = new sparse_merkle_tree_1.SparseMerkleTree({ db, keyLength: 32 });
		});
		for (const test of ProofFixtures.testCases) {
			it(test.description, async () => {
				const inputKeys = test.input.keys;
				const inputValues = test.input.values;
				const queryKeys = test.input.queryKeys.map(keyHex => Buffer.from(keyHex, 'hex'));
				const outputMerkleRoot = test.output.merkleRoot;
				const outputProof = test.output.proof;
				for (let i = 0; i < inputKeys.length; i += 1) {
					await smt.update(Buffer.from(inputKeys[i], 'hex'), Buffer.from(inputValues[i], 'hex'));
				}
				const proof = await smt.generateMultiProof(queryKeys);
				const siblingHashesString = [];
				for (const siblingHash of proof.siblingHashes) {
					siblingHashesString.push(siblingHash.toString('hex'));
				}
				const queriesString = [];
				for (const query of proof.queries) {
					queriesString.push({
						key: query.key.toString('hex'),
						value: query.value.toString('hex'),
						bitmap: query.bitmap.toString('hex'),
					});
				}
				expect(siblingHashesString).toEqual(outputProof.siblingHashes);
				expect(queriesString).toEqual(outputProof.queries);
				expect(
					utils_1.verify(queryKeys, proof, Buffer.from(outputMerkleRoot, 'hex'), 32),
				).toBeTrue();
			});
		}
	});
	describe.skip('generateMultiProof - Jumbo fixtures', () => {
		let db;
		let smt;
		beforeEach(() => {
			db = new inmemory_db_1.InMemoryDB();
			smt = new sparse_merkle_tree_1.SparseMerkleTree({ db, keyLength: 32 });
		});
		for (const test of JumboFixtures.testCases) {
			it(test.description, async () => {
				const inputKeys = test.input.keys;
				const inputValues = test.input.values;
				const removeKeys = test.input.deleteKeys;
				const queryKeys = test.input.queryKeys.map(keyHex => Buffer.from(keyHex, 'hex'));
				const outputMerkleRoot = test.output.merkleRoot;
				const outputProof = test.output.proof;
				for (let i = 0; i < inputKeys.length; i += 1) {
					await smt.update(Buffer.from(inputKeys[i], 'hex'), Buffer.from(inputValues[i], 'hex'));
				}
				for (const key of removeKeys) {
					await smt.remove(Buffer.from(key, 'hex'));
				}
				const proof = await smt.generateMultiProof(queryKeys);
				const siblingHashesString = [];
				for (const siblingHash of proof.siblingHashes) {
					siblingHashesString.push(siblingHash.toString('hex'));
				}
				const queriesString = [];
				for (const query of proof.queries) {
					queriesString.push({
						key: query.key.toString('hex'),
						value: query.value.toString('hex'),
						bitmap: query.bitmap.toString('hex'),
					});
				}
				expect(siblingHashesString).toEqual(outputProof.siblingHashes);
				expect(queriesString).toEqual(outputProof.queries);
				expect(
					utils_1.verify(queryKeys, proof, Buffer.from(outputMerkleRoot, 'hex'), 32),
				).toBeTrue();
			});
		}
	});
});
//# sourceMappingURL=sparse_merkle_tree.spec.js.map
