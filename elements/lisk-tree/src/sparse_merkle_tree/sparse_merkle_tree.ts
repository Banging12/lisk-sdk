/*
 * Copyright © 2021 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

import { DEFAULT_KEY_LENGTH, EMPTY_HASH, EMPTY_VALUE, NodeSide } from './constants';
import { Leaf } from './leaf';
import { Database, Proof, Query } from './types';
import {
	parseBranchData,
	parseLeafData,
	isLeaf,
	binaryExpansion,
	sortByBitmapAndKey,
	binaryStringToBuffer,
	bufferToBinaryString,
	treeSort,
	splitKeys,
	sortKeys,
	isBitSet,
} from './utils';
import { binarySearch } from '../utils';
import { Branch } from './branch';
import { Empty } from './empty';

type TreeNode = Branch | Leaf | Empty;
type SingleProof = {
	key: Buffer;
	value: Buffer;
	binaryBitmap: string;
	ancestorHashes: Buffer[];
	siblingHashes: Buffer[];
};
type QueryWithHeight = {
	key: Buffer;
	value: Buffer;
	binaryBitmap: string;
	siblingHashes: Buffer[];
	height: number;
};

export class SparseMerkleTree {
	public counter = 0;
	private readonly _db: Database;
	private readonly _keyLength: number;
	private _rootHash: Buffer;

	public constructor(options: { db: Database; rootHash?: Buffer; keyLength?: number }) {
		this._db = options.db;
		this._keyLength = options.keyLength ?? DEFAULT_KEY_LENGTH;
		// Make sure to always set rootHash explicitly whenever updating the tree
		this._rootHash = options.rootHash ?? EMPTY_HASH;
	}
	public get rootHash(): Buffer {
		return this._rootHash;
	}

	public get keyLength(): number {
		return this._keyLength;
	}

	public async getNode(nodeHash: Buffer): Promise<TreeNode> {
		if (nodeHash.equals(EMPTY_HASH)) {
			return new Empty();
		}
		const data = await this._db.get(nodeHash);

		if (!data) {
			throw new Error(
				`Node with input hash: ${nodeHash.toString('hex')} does not exist in the tree`,
			);
		}
		if (isLeaf(data)) {
			const { key, value } = parseLeafData(data, this.keyLength);

			return new Leaf(key, value, nodeHash);
		}

		const { leftHash, rightHash } = parseBranchData(data);

		return new Branch(leftHash, rightHash, nodeHash);
	}
	// As specified in from https://github.com/LiskHQ/lips/blob/master/proposals/lip-0039.md
	public async update(key: Buffer, value: Buffer): Promise<TreeNode> {
		if (value.length === 0) {
			throw new Error('Value cannot be empty');
		}

		if (key.byteLength !== this.keyLength) {
			throw new Error(`Key is not equal to defined key length of ${this.keyLength}`);
		}
		const root = await this.getNode(this._rootHash);
		const newRoot = await this._update(key, value, root, 0);
		this._rootHash = newRoot.hash;

		return newRoot;
	}

	public async updateBatch(keys: Buffer[], values: Buffer[]): Promise<TreeNode> {
		if (keys.length !== values.length) {
			throw new Error('Keys and values must have the same length');
		}
		if (keys.length === 0) {
			return this.getNode(this._rootHash);
		}
		if (keys.length === 1) {
			return this.update(keys[0], values[0]);
		}

		if (keys[0].length !== this.keyLength) {
			throw new Error(`Key is not equal to defined key length of ${this.keyLength}`);
		}

		const { keys: sortedKey, values: sortedValue } = sortKeys(keys, values);

		const root = await this.getNode(this._rootHash);
		const newRoot = await this._updateBatch(sortedKey, sortedValue, root, 0);
		this._rootHash = newRoot.hash;

		return newRoot;
	}

	public async remove(key: Buffer): Promise<TreeNode> {
		if (key.length !== this.keyLength) {
			throw new Error(`Key is not equal to defined key length of ${this.keyLength}`);
		}

		const ancestorNodes: TreeNode[] = [];
		const binaryKey = binaryExpansion(key, this.keyLength);
		let currentNode = await this.getNode(this._rootHash);
		let h = 0;
		let currentNodeSibling: TreeNode = new Empty();

		// Collect all ancestor nodes through traversing the binary expansion by height
		// End of the loop ancestorNodes has all the branch nodes
		// currentNode will be the leaf/node we are looking to remove
		while (currentNode instanceof Branch) {
			ancestorNodes.push(currentNode);
			const d = binaryKey[h];
			if (d === '0') {
				currentNodeSibling = await this.getNode(currentNode.rightHash);
				currentNode = await this.getNode(currentNode.leftHash);
			} else if (d === '1') {
				currentNodeSibling = await this.getNode(currentNode.leftHash);
				currentNode = await this.getNode(currentNode.rightHash);
			}
			h += 1;
		}

		// When currentNode is empty, nothing to remove
		if (currentNode instanceof Empty) {
			return currentNode;
		}
		// When the input key does not match node key, nothing to remove
		if (!currentNode.key.equals(key)) {
			return currentNode;
		}
		let bottomNode: TreeNode = new Empty();

		// currentNode has a branch sibling, delete currentNode
		if (currentNodeSibling instanceof Branch) {
			await this._db.del(currentNode.hash);
		} else if (currentNodeSibling instanceof Leaf) {
			// currentNode has a leaf sibling,
			// remove the leaf and move sibling up the tree
			await this._db.del(currentNode.hash);
			bottomNode = currentNodeSibling;

			h -= 1;
			// In order to move sibling up the tree
			// an exact emptyHash check is required
			// not using EMPTY_HASH here to make sure we use correct hash from Empty class
			const emptyHash = new Empty().hash;
			while (h > 0) {
				const p = ancestorNodes[h - 1] as Branch;

				// if one of the children is empty then break the condition
				if (
					p instanceof Branch &&
					!p.leftHash.equals(emptyHash) &&
					!p.rightHash.equals(emptyHash)
				) {
					break;
				}

				await this._db.del(p.hash);
				h -= 1;
			}
		}

		// finally update all branch nodes in ancestorNodes.
		// note that h now is set to the correct height from which
		// nodes have to be updated
		while (h > 0) {
			const p = ancestorNodes[h - 1];
			const d = binaryKey.charAt(h - 1);

			if (d === '0') {
				(p as Branch).update(bottomNode.hash, NodeSide.LEFT);
			} else if (d === '1') {
				(p as Branch).update(bottomNode.hash, NodeSide.RIGHT);
			}
			await this._db.set(p.hash, (p as Branch).data);
			bottomNode = p;
			h -= 1;
		}
		this._rootHash = bottomNode.hash;

		return bottomNode;
	}

	public async generateSingleProof(queryKey: Buffer): Promise<SingleProof> {
		const rootNode = await this.getNode(this._rootHash);
		let currentNode = rootNode;
		if (currentNode instanceof Empty) {
			return {
				key: queryKey,
				value: EMPTY_VALUE,
				binaryBitmap: bufferToBinaryString(EMPTY_VALUE),
				siblingHashes: [],
				ancestorHashes: [],
			};
		}

		let h = 0;
		const siblingHashes = [];
		const ancestorHashes = [];
		let binaryBitmap = '';
		const binaryKey = binaryExpansion(queryKey, this.keyLength);

		while (currentNode instanceof Branch) {
			ancestorHashes.push(currentNode.hash);
			const d = binaryKey.charAt(h);
			let currentNodeSibling: TreeNode = new Empty();
			if (d === '0') {
				currentNodeSibling = await this.getNode(currentNode.rightHash);
				currentNode = await this.getNode(currentNode.leftHash);
			} else if (d === '1') {
				currentNodeSibling = await this.getNode(currentNode.leftHash);
				currentNode = await this.getNode(currentNode.rightHash);
			}

			if (currentNodeSibling instanceof Empty) {
				binaryBitmap = `0${binaryBitmap}`;
			} else {
				binaryBitmap = `1${binaryBitmap}`;
				siblingHashes.push(currentNodeSibling.hash);
			}
			h += 1;
		}

		if (currentNode instanceof Empty) {
			// exclusion proof
			return {
				siblingHashes,
				ancestorHashes,
				binaryBitmap,
				key: queryKey,
				value: EMPTY_VALUE,
			};
		}

		if (!currentNode.key.equals(queryKey)) {
			// exclusion proof
			ancestorHashes.push(currentNode.hash); // in case the leaf is sibling to another node
			return {
				siblingHashes,
				ancestorHashes,
				binaryBitmap,
				key: currentNode.key,
				value: currentNode.value,
			};
		}

		// inclusion proof
		ancestorHashes.push(currentNode.hash); // in case the leaf is sibling to another node
		return {
			siblingHashes,
			ancestorHashes,
			binaryBitmap,
			key: currentNode.key,
			value: currentNode.value,
		};
	}

	public async generateMultiProof(queryKeys: Buffer[]): Promise<Proof> {
		const partialQueries: SingleProof[] = [];
		for (const queryKey of queryKeys) {
			const query = await this.generateSingleProof(queryKey);
			partialQueries.push(query);
		}

		const queries: Query[] = [...partialQueries].map(sp => ({
			bitmap: binaryStringToBuffer(sp.binaryBitmap),
			key: sp.key,
			value: sp.value,
		}));
		const siblingHashes: Buffer[] = [];
		const ancestorHashes = [...partialQueries].map(sp => sp.ancestorHashes).flat();
		let sortedQueries: QueryWithHeight[] = [...partialQueries].map(sp => ({
			binaryBitmap: sp.binaryBitmap,
			key: sp.key,
			value: sp.value,
			siblingHashes: sp.siblingHashes,
			height: sp.binaryBitmap.length,
		}));
		sortedQueries = sortByBitmapAndKey(sortedQueries);

		while (sortedQueries.length > 0) {
			const sp = sortedQueries.shift()!;
			if (sp.height === 0) {
				continue;
			}
			const b = sp.binaryBitmap.charAt(sp.binaryBitmap.length - sp.height);
			if (b === '1') {
				const nodeHash = sp.siblingHashes.pop()!;
				let isPresentInSiblingHashes = false;
				let isPresentInAncestorHashes = false;
				for (const i of siblingHashes) {
					if (i.equals(nodeHash)) {
						isPresentInSiblingHashes = true;
						break;
					}
				}
				for (const i of ancestorHashes) {
					if (i.equals(nodeHash)) {
						isPresentInAncestorHashes = true;
						break;
					}
				}
				if (!isPresentInSiblingHashes && !isPresentInAncestorHashes) {
					// TODO : optimize this
					siblingHashes.push(nodeHash);
				}
			}
			sp.height -= 1;

			if (sortedQueries.length > 0) {
				const sortedQueriesWithBinaryKey = sortedQueries.map(query => ({
					binaryKey: binaryExpansion(query.key, this.keyLength),
					binaryBitmap: query.binaryBitmap,
					value: query.value,
					siblingHashes: query.siblingHashes,
					height: query.height,
				}));
				const spWithBinaryKey = {
					binaryKey: binaryExpansion(sp.key, this.keyLength),
					binaryBitmap: sp.binaryBitmap,
					value: sp.value,
					siblingHashes: sp.siblingHashes,
					height: sp.height,
				};
				const insertIndex = binarySearch(
					sortedQueriesWithBinaryKey,
					callback => treeSort(spWithBinaryKey, callback) < 0,
				);
				if (insertIndex === sortedQueries.length) {
					sortedQueries.push(sp);
				} else {
					const keyPrefix = binaryExpansion(sp.key, this.keyLength).substring(0, sp.height);
					const query = sortedQueries[insertIndex];

					if (!binaryExpansion(query.key, this.keyLength).endsWith(keyPrefix, query.height)) {
						sortedQueries.splice(insertIndex, 0, sp);
					}
				}
			} else {
				sortedQueries.push(sp);
			}
		}

		return { siblingHashes, queries };
	}

	private async _updateBatch(
		keys: Buffer[],
		values: Buffer[],
		currentNode: TreeNode,
		height: number,
	): Promise<TreeNode> {
		if (keys.length === 0) {
			return currentNode;
		}
		if (keys.length === 1) {
			return this._update(keys[0], values[0], currentNode, height);
		}

		const { left: lKeys, right: rKeys } = splitKeys(keys, height);
		const index = lKeys.length;
		const lValues = values.slice(0, index);
		const rValues = values.slice(index);

		let leftNode: TreeNode = new Empty();
		let rightNode: TreeNode = new Empty();
		if (currentNode instanceof Leaf) {
			if (isBitSet(currentNode.key, height)) {
				rightNode = currentNode;
			} else {
				leftNode = currentNode;
			}
		}
		if (currentNode instanceof Branch) {
			leftNode = await this.getNode(currentNode.leftHash);
			rightNode = await this.getNode(currentNode.rightHash);
			await this._db.del(currentNode.hash);
		}

		let leftNodeHash = leftNode.hash;
		let rightNodeHash = rightNode.hash;
		if (lKeys.length > 0 && rKeys.length === 0) {
			const updated = await this._updateBatch(lKeys, lValues, leftNode, height + 1);
			leftNodeHash = updated.hash;
		} else if (rKeys.length > 0 && lKeys.length === 0) {
			const updated = await this._updateBatch(rKeys, rValues, rightNode, height + 1);
			rightNodeHash = updated.hash;
		} else {
			const [updatedLeft, updatedRight] = await Promise.all([
				this._updateBatch(lKeys, lValues, leftNode, height + 1),
				this._updateBatch(rKeys, rValues, rightNode, height + 1),
			]);
			leftNodeHash = updatedLeft.hash;
			rightNodeHash = updatedRight.hash;
		}

		const nextBranch = Branch.fromData(leftNodeHash, rightNodeHash);
		this.counter += 1;
		await this._db.set(nextBranch.hash, nextBranch.data);

		return nextBranch;
	}

	private async _update(
		key: Buffer,
		value: Buffer,
		currentNode: TreeNode,
		height = 0,
	): Promise<TreeNode> {
		const newLeaf = Leaf.fromData(key, value);
		this.counter += 1;
		await this._db.set(newLeaf.hash, newLeaf.data);
		// if the currentNode is EMPTY node then assign it to leafNode and return
		let result = currentNode;
		if (result instanceof Empty) {
			return newLeaf;
		}
		let h = height;
		const ancestorNodes: TreeNode[] = [];
		while (result instanceof Branch) {
			// Append currentNode to ancestorNodes
			ancestorNodes.push(result);
			if (isBitSet(key, h)) {
				result = await this.getNode(result.rightHash);
			} else {
				result = await this.getNode(result.leftHash);
			}
			h += 1;
		}

		// The currentNode is an empty node, newLeaf will replace the default empty node or currentNode will be updated to newLeaf
		let bottomNode: TreeNode = new Empty();
		if (result instanceof Empty) {
			// delete the empty node and update the tree, the new leaf will substitute the empty node
			bottomNode = newLeaf;
		} else if (result.key.equals(key)) {
			bottomNode = newLeaf;
		} else {
			// We need to create new branches in the tree to fulfill the
			// Condition of one leaf per empty subtree
			// Note: h is set to the last value from the previous loop
			while (isBitSet(key, h) === isBitSet(result.key, h)) {
				// Create branch node with empty value
				const newBranch = Branch.fromData(EMPTY_HASH, EMPTY_HASH);
				this.counter += 1;
				// Append defaultBranch to ancestorNodes
				ancestorNodes.push(newBranch);
				h += 1;
			}
			// Create last branch node, parent of node and newLeaf
			if (isBitSet(key, h)) {
				bottomNode = Branch.fromData(result.hash, newLeaf.hash);
				this.counter += 1;
				await this._db.set(bottomNode.hash, bottomNode.data);
			} else {
				bottomNode = Branch.fromData(newLeaf.hash, result.hash);
				this.counter += 1;
				await this._db.set(bottomNode.hash, bottomNode.data);
			}
		}
		// Finally update all branch nodes in ancestorNodes
		// Starting from the last
		while (h > height) {
			const index = ancestorNodes.length - 1;
			const ancestor = ancestorNodes[index];
			ancestorNodes.splice(index, 1);
			await this._db.del(ancestor.hash);
			if (isBitSet(key, h - 1)) {
				(ancestor as Branch).update(bottomNode.hash, NodeSide.RIGHT);
			} else {
				(ancestor as Branch).update(bottomNode.hash, NodeSide.LEFT);
			}
			await this._db.set(ancestor.hash, (ancestor as Branch).data);
			bottomNode = ancestor;
			h -= 1;
		}
		return bottomNode;
	}
}
