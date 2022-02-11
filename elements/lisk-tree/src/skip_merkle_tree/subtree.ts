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
import { branchData, subTreeData } from './utils';
import { TreeNode } from './types';

export class SubTree {
    private readonly _structure: number[];
    private readonly _nodes: TreeNode[];
    private readonly _hash: Buffer;
    private readonly _data: Buffer;

	public constructor(structure: number[], nodes: TreeNode[], nodeHash: Buffer) {
        this._structure = structure;
        this._nodes = nodes;
        this._hash = nodeHash;
        this._data = subTreeData(structure, nodes);
	}

    public get structure() {
		return this._structure;
	}

    public get nodes() {
		return this._nodes;
	}

    public get data() {
		return this._data;
	}

    public static calculateRoot(structure: number[], nodes: TreeNode[]): Buffer {
        let nodeHashes: Buffer[] = nodes.map(node => node.hash);
        const H = structure.length;
        for (let height = H; height > 0; height--) {
            const _hashes: Buffer[] = []
            const _structure: number[] = []
            
            let i = 0;

            while (i < nodeHashes.length) {
                if (structure[i] == height) {
                    const _hash = hash(branchData(Buffer.concat([nodeHashes[i], nodeHashes[i + 1]])));
                    _hashes.push(_hash)
                    _structure.push(structure[i] - 1)
                    i += 1
                }
                else {
                    _hashes.push(nodeHashes[i])
                    _structure.push(structure[i])
                }
                i += 1  
            }
            nodeHashes = _hashes;
            structure = _structure;
        } 
        return nodeHashes[0];
    }

	public static fromData(structure: number[], nodes: TreeNode[]): SubTree {
        const nodeHash = this.calculateRoot(structure, nodes);
		return new SubTree(structure, nodes, nodeHash);
	}

	public get hash() {
        return this._hash;
	}

    

    
}

