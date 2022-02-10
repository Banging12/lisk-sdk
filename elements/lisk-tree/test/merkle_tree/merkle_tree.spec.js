'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const fixture = require('../fixtures/transaction_merkle_root/transaction_merkle_root.json');
const merkle_tree_1 = require('../../src/merkle_tree/merkle_tree');
describe('MerkleTree', () => {
	describe('constructor', () => {
		for (const test of fixture.testCases) {
			describe(test.description, () => {
				it('should result in correct merkle root', async () => {
					const inputs = test.input.transactionIds.map(hexString => Buffer.from(hexString, 'hex'));
					const merkleTree = new merkle_tree_1.MerkleTree();
					await merkleTree.init(inputs);
					expect(merkleTree.root).toEqual(Buffer.from(test.output.transactionMerkleRoot, 'hex'));
				});
				describe('should allow pre-hashed leafs', () => {
					if (test.input.transactionIds.length > 2 ** 2) {
						it('should result in same merkle root if divided into sub tree of power of 2', async () => {
							const inputs = test.input.transactionIds.map(hexString =>
								Buffer.from(hexString, 'hex'),
							);
							const subTreeRoots = [];
							const chunk = 2 ** 2;
							for (let i = 0; i < inputs.length; i += chunk) {
								const tree = new merkle_tree_1.MerkleTree();
								await tree.init(inputs.slice(i, i + chunk));
								subTreeRoots.push(tree.root);
							}
							const expectedTree = new merkle_tree_1.MerkleTree({ preHashedLeaf: true });
							await expectedTree.init(subTreeRoots);
							expect(expectedTree.root).toEqual(
								Buffer.from(test.output.transactionMerkleRoot, 'hex'),
							);
						});
						it('should not result in same merkle root if divided into sub tree which is not power of 2', async () => {
							const inputs = test.input.transactionIds.map(hexString =>
								Buffer.from(hexString, 'hex'),
							);
							const subTreeRoots = [];
							const chunk = 3;
							for (let i = 0; i < inputs.length; i += chunk) {
								const tree = new merkle_tree_1.MerkleTree();
								await tree.init(inputs.slice(i, i + chunk));
								subTreeRoots.push(tree.root);
							}
							const expectedTree = new merkle_tree_1.MerkleTree({ preHashedLeaf: true });
							await expectedTree.init(subTreeRoots);
							expect(expectedTree.root).not.toEqual(
								Buffer.from(test.output.transactionMerkleRoot, 'hex'),
							);
						});
					}
				});
			});
		}
	});
	describe('append', () => {
		for (const test of fixture.testCases.slice(1)) {
			describe(test.description, () => {
				it('should append and have correct root', async () => {
					const inputs = test.input.transactionIds.map(hexString => Buffer.from(hexString, 'hex'));
					const toAppend = inputs.pop();
					const merkleTree = new merkle_tree_1.MerkleTree();
					await merkleTree.init(inputs);
					await merkleTree.append(toAppend);
					expect(merkleTree.root).toEqual(Buffer.from(test.output.transactionMerkleRoot, 'hex'));
				});
			});
		}
	});
});
//# sourceMappingURL=merkle_tree.spec.js.map
