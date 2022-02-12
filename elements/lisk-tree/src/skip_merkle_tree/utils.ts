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

import { Branch } from './branch';
import { BRANCH_HASH_PREFIX, BRANCH_HASH_PREFIX_INT, EMPTY_PLACEHOLDER_PREFIX, EMPTY_PLACEHOLDER_PREFIX_INT, LEAF_HASH_PREFIX, LEAF_HASH_PREFIX_INT, NODE_HASH_SIZE } from './constants';
import { Empty } from './empty';
import { Leaf } from './leaf';
import { TreeNode } from './types';


export const isLeaf = (value: Buffer): boolean => value[0] === LEAF_HASH_PREFIX[0];

export const parseLeafData = (data: Buffer, keyLength: number): { key: Buffer; value: Buffer } => {
	// Get the key of keyLength size
	const key = data.slice(1, keyLength + 1);
	// Get data
	const value = data.slice(keyLength + 1, data.length);

	return {
		key,
		value,
	};
};
export const parseBranchData = (data: Buffer): Buffer => {
	return data.slice(-1 * NODE_HASH_SIZE);
};

export const isBitSet = (bits: Buffer, i: number): boolean =>
	// eslint-disable-next-line no-bitwise
	((bits[Math.floor(i / 8)] << i % 8) & 0x80) === 0x80;

export const parseSubTreeData = (data: Buffer, keyLength: number): [number[], TreeNode[]] => {
	const subtreeNodesLength = data[0] + 1;
    const structure: number[] = [];
    for (let index = 1; index < subtreeNodesLength + 1; index+=1) {
        structure.push(data[index]);
    }
    const nodesData = data.slice(subtreeNodesLength + 1);

    const nodes: TreeNode[] = [];

    let idx = 0;
    while (idx < nodesData.length) {
        if (nodesData[idx] === LEAF_HASH_PREFIX_INT) {
            const key = nodesData.slice(idx + LEAF_HASH_PREFIX.length, idx + LEAF_HASH_PREFIX.length + keyLength)
            const value = nodesData.slice(idx + LEAF_HASH_PREFIX.length + keyLength, idx + LEAF_HASH_PREFIX.length + keyLength + NODE_HASH_SIZE)
            nodes.push(Leaf.fromData(key, value));

            idx += LEAF_HASH_PREFIX.length + keyLength + NODE_HASH_SIZE;
        } else if (nodesData[idx] === BRANCH_HASH_PREFIX_INT) {
            const _hash = nodesData.slice(idx + BRANCH_HASH_PREFIX.length, idx + BRANCH_HASH_PREFIX.length + NODE_HASH_SIZE)
            nodes.push(Branch.fromData(_hash));

            idx += BRANCH_HASH_PREFIX.length + NODE_HASH_SIZE;
        } else if (nodesData[idx] === EMPTY_PLACEHOLDER_PREFIX_INT) {
            nodes.push(new Empty());
            idx += EMPTY_PLACEHOLDER_PREFIX.length;
        }
        else
            throw new Error('Invalid SubTree data.');
    }
    return [structure, nodes];
}

export const leafData = (key: Buffer, value: Buffer): Buffer =>
	Buffer.concat([LEAF_HASH_PREFIX, key, value]);

export const branchData = (nodeHash: Buffer): Buffer =>
	Buffer.concat([BRANCH_HASH_PREFIX, nodeHash]);

export const subTreeData = (structure: number[], nodes: TreeNode[]): Buffer => {
    const subtreeNodesLength = Buffer.from([structure.length - 1]);
    const structureData = Buffer.concat(structure.map(h => Buffer.from([h])));
    const nodesData = Buffer.concat(nodes.map(node => node.data));
    return Buffer.concat([subtreeNodesLength, structureData, nodesData]);
}

export const cumulativeSum = (numberArray: number[]): number[] => {
    let cumSum = 0;
    return numberArray.map(x => cumSum += x);
}

export const sortKeys = (
	keys: Buffer[],
	values: Buffer[],
): { keys: Buffer[]; values: Buffer[] } => {
	const kv = [];
	for (let i = 0; i < keys.length; i += 1) {
		kv.push({
			key: keys[i],
			value: values[i],
		});
	}
	kv.sort((a, b) => a.key.compare(b.key));
	const sortedKey = [];
	const sortedValue = [];
	for (let i = 0; i < kv.length; i += 1) {
		sortedKey[i] = kv[i].key;
		sortedValue[i] = kv[i].value;
	}
	return {
		keys: sortedKey,
		values: sortedValue,
	};
};
