/*
 * Copyright © 2022 Lisk Foundation
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
import { EMPTY_HASH } from './constants';
import { TreeNode, TreeNodeType } from './tree_node';
import { Database } from './types';

const decodeValue = (val: Buffer): Buffer[] => {
	const result = [];
	result.push(Buffer.from([val[0]]));
	let offset = 1;
	while (offset < val.length) {
		if (val[offset] === TreeNodeType.EMPTY) {
			offset += 1;
			result.push(Buffer.from([TreeNodeType.EMPTY]));
			continue;
		}
		const size = 1 + EMPTY_HASH.length;
		result.push(val.slice(offset, offset + size));
		offset += size;
	}
	return result;
};

const encodeValue = (vals: Buffer[]): Buffer => Buffer.concat(vals);

export enum TreeDirection {
	LEFT = 0,
	RIGHT,
}

export class TreeCache {
	private readonly _db: Database;

	private readonly _posMap: Record<string, Buffer>;

	public constructor(db: Database) {
		this._db = db;
		this._posMap = {};
	}

	public async getRoot(nodeHash: Buffer): Promise<TreeNode> {
		if (nodeHash.equals(EMPTY_HASH)) {
			return TreeNode.newEmpty(0, 0);
		}
		const root = await this._getTreeNodeFromDB(nodeHash, 0, 0);
		this._posMap[root.pos.key()] = nodeHash;
		return root;
	}

	public async get(parent: TreeNode, direction: TreeDirection): Promise<TreeNode> {
		if (!parent.isBranch()) {
			throw new Error('Only branch can obtain childern');
		}
		const childPos = direction === TreeDirection.LEFT ? parent.left() : parent.right();
		if (!childPos.isRoot()) {
			const rootPos = childPos.root();
			const cached = this._posMap[rootPos.key()];
			if (!cached) {
				throw new Error('Root cache skipped');
			}
			const node = this._getTreeNodeFromDB(cached, childPos.height, childPos.index);
			return node;
		}

		const cached = this._posMap[childPos.key()];
		if (cached) {
			const node = this._getTreeNodeFromDB(cached, childPos.height, 0);
			return node;
		}
		// get the child hash
		const parentRoot = parent.root();
		const cachedParent = this._posMap[parentRoot.key()];
		if (!cachedParent) {
			throw new Error('Root cache skipped');
		}
		// this node pos is respect parent root
		const node = await this._getTreeNodeFromDB(cachedParent, childPos.height, childPos.index);
		// reset index to be zero
		node.resetIndex();
		this._posMap[node.pos.key()] = node.hash;
		return node;
	}

	public async set(node: TreeNode): Promise<void> {
		if (!node.isRoot()) {
			const rootPos = node.root();
			const cached = this._posMap[rootPos.key()];
			if (!cached) {
				throw new Error('Root cache skipped');
			}
			const data = await this._db.get(cached);
			const decoded = decodeValue(data);
			decoded[node.index] = node.toBytes();
			await this._db.set(cached, encodeValue(decoded));
			return;
		}
		const data = await this._db.get(node.hash);
		const decoded = decodeValue(data);
		decoded[node.index] = node.toBytes();
		await this._db.set(node.hash, encodeValue(decoded));
	}

	public async del(node: TreeNode): Promise<void> {
		if (node.isRoot()) {
			const cached = this._posMap[node.pos.key()];
			if (!cached) {
				throw new Error('Node to delete never cached');
			}
			delete this._posMap[node.pos.key()];
			await this._db.del(cached);
		}
		await this.set(TreeNode.newEmpty(node.height, node.index));
	}

	private async _getTreeNodeFromDB(
		rootHash: Buffer,
		height: number,
		index: number,
	): Promise<TreeNode> {
		const data = await this._db.get(rootHash);
		if (index === 0) {
			return TreeNode.fromTypeAndKey(height, index, data[0], rootHash);
		}
		return TreeNode.fromBytes(height, index, decodeValue(data)[index]);
	}
}
