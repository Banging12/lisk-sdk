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

import { hash } from '@liskhq/lisk-cryptography';
import { EMPTY_HASH } from './constants';
import { Position } from './position';
import { branchData, leafData } from './utils';

export enum TreeNodeType {
	EMPTY = 0,
	LEAF,
	BRANCH,
}

export class TreeNode {
	private readonly _pos: Position;
	private readonly _type: number;
	private readonly _hash: Buffer;

	public constructor(height: number, index: number, type: TreeNodeType, hashed: Buffer) {
		this._pos = new Position(height, index);
		this._type = type;
		this._hash = hashed;
	}

	public static newBranch(height: number, index: number, left: Buffer, right: Buffer): TreeNode {
		const data = hash(branchData(left, right));

		return new TreeNode(height, index, TreeNodeType.BRANCH, data);
	}

	public static newLeaf(height: number, index: number, key: Buffer, value: Buffer): TreeNode {
		const data = hash(leafData(key, value));

		return new TreeNode(height, index, TreeNodeType.LEAF, data);
	}

	public static newEmpty(height: number, index: number): TreeNode {
		return new TreeNode(height, index, TreeNodeType.EMPTY, EMPTY_HASH);
	}

	public static fromBytes(height: number, index: number, bytes: Buffer): TreeNode {
		if (bytes[0] === TreeNodeType.EMPTY) {
			return new TreeNode(height, index, TreeNodeType.EMPTY, EMPTY_HASH);
		}
		if (bytes[0] === TreeNodeType.BRANCH) {
			return new TreeNode(height, index, TreeNodeType.BRANCH, bytes.slice(1));
		}
		if (bytes[0] === TreeNodeType.LEAF) {
			return new TreeNode(height, index, TreeNodeType.LEAF, bytes.slice(1));
		}
		throw new Error('Invalid tree node type');
	}

	public static fromTypeAndKey(
		height: number,
		index: number,
		type: number,
		bytes: Buffer,
	): TreeNode {
		if (type === TreeNodeType.EMPTY) {
			return new TreeNode(height, index, TreeNodeType.EMPTY, EMPTY_HASH);
		}
		if (type === TreeNodeType.BRANCH) {
			return new TreeNode(height, index, TreeNodeType.BRANCH, bytes);
		}
		if (type === TreeNodeType.LEAF) {
			return new TreeNode(height, index, TreeNodeType.LEAF, bytes);
		}
		throw new Error('Invalid tree node type');
	}

	public get height(): number {
		return this._pos.height;
	}

	public get index(): number {
		return this._pos.index;
	}

	public get hash(): Buffer {
		return this._hash;
	}

	public get pos(): Position {
		return this._pos;
	}

	public isRoot(): boolean {
		return this._pos.isRoot();
	}

	public root(): Position {
		return this._pos.root();
	}

	public up(): Position {
		return this._pos.up();
	}

	public right(): Position {
		return this._pos.right();
	}

	public left(): Position {
		return this._pos.left();
	}

	public equal(hashed: Buffer): boolean {
		return this._hash.equals(hashed);
	}

	public resetIndex(): void {
		this._pos.resetIndex();
	}

	public isEmpty(): boolean {
		return this._type === TreeNodeType.EMPTY;
	}

	public isBranch(): boolean {
		return this._type === TreeNodeType.BRANCH;
	}

	public isLeaf(): boolean {
		return this._type === TreeNodeType.LEAF;
	}

	public toBytes(): Buffer {
		if (this.isEmpty()) {
			return Buffer.from([TreeNodeType.EMPTY]);
		}
		const type = this.isBranch() ? TreeNodeType.BRANCH : TreeNodeType.LEAF;
		const result = Buffer.alloc(1 + EMPTY_HASH.length);
		result[0] = type;
		this._hash.copy(result, 1);
		return result;
	}
}
