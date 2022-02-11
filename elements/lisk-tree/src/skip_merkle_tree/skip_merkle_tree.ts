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

import { DEFAULT_KEY_LENGTH, EMPTY_HASH } from './constants';
import { Leaf } from './leaf';
import { Database, TreeNode} from './types';
import {
	sortKeys,
    parseSubTreeData,
} from './utils';
import { Branch } from './branch';
import { Empty } from './empty';

import { SubTree } from './subtree';
import { isBitSet } from './utils';


export class SkipMerkleTree {
	public counter = 0;
	private readonly _db: Database;
	private readonly _keyLength: number;
    private readonly _subtreeHeight = 4;
    private readonly _numberOfNodes = 1 << this._subtreeHeight;
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

    public get subtreeHeight(): number {
		return this._subtreeHeight;
	}

    public get numberOfNodes(): number {
		return this._numberOfNodes;
	}

    public async getSubTree(nodeHash: Buffer): Promise<SubTree> {
        if (nodeHash.equals(EMPTY_HASH)) {
			return SubTree.fromData([0], [new Empty()]);
		}
		const data = await this._db.get(nodeHash);

		if (!data) {
			throw new Error(
				`SubTree with input hash: ${nodeHash.toString('hex')} does not exist in the tree`,
			);
		}

		const [structure, nodes] = parseSubTreeData(data);
		return SubTree.fromData(structure, nodes);
    }
	
	// As specified in from https://github.com/LiskHQ/lips/blob/master/proposals/lip-0039.md
	public async update(keys: Buffer[], values: Buffer[]): Promise<SubTree> {
            if (keys.length !== values.length) {
                throw new Error('Keys and values must have the same length');
            }
            if (keys.length === 0) {
                return await this.getSubTree(this._rootHash);
            }
    
            if (keys[0].length !== this.keyLength) {
                throw new Error(`Key is not equal to defined key length of ${this.keyLength}`);
            }
    
        const { keys: sortedKey, values: sortedValue } = sortKeys(keys, values);
		const root = await this.getSubTree(this._rootHash);
		const newRoot = await this._updateSubtree(sortedKey, sortedValue, root, 0);
		this._rootHash = newRoot.hash;

		return newRoot;
	}

	private async _updateSubtree(
		keys: Buffer[],
        values: Buffer[],
        currentSubtree: SubTree,
        height: number
	): Promise<SubTree> {

        
        if (keys.length === 0)
            return currentSubtree

        const bin_keys: Buffer[][] = [];
        const bin_values: Buffer[][] = [];

        for (let i = 0; i < this.numberOfNodes; i++) {
            bin_keys.push([]);
            bin_values.push([]);
        }

        const b = Math.floor(height/8);
        for (let i = 0; i < keys.length; i++) {
            const k = keys[i];
            const v = values[i];
            let bin_idx;
            if (height%8 === 0) 
                bin_idx = k[b] >> 4;
            else if (height%8 === 4)
                bin_idx = k[b] & 15;
            else
                throw new Error('Invalid key.')
                
            bin_keys[bin_idx].push(k)
            bin_values[bin_idx].push(v)
        }
            

        const new_nodes: TreeNode[] = [];
        const new_structure: number[] = [];

        let V = 0;

        for (let i = 0; i < currentSubtree.nodes.length; i++) {
            const h = currentSubtree.structure[i];
            const currentNode = currentSubtree.nodes[i];
            const incr = 1 << (this.subtreeHeight - h);

            const [_nodes, _heights] = await this._updateNode(
                bin_keys.slice(V, V + incr), bin_values.slice(V, V + incr), currentNode, height, h
            )
            new_nodes.push(... _nodes);
            new_structure.push(... _heights);
            V += incr
        }


        const new_subtree = SubTree.fromData(new_structure, new_nodes);
        await this._db.set(new_subtree.hash, new_subtree.data);
        return new_subtree;
    }

    private async _updateNode(
		key_bins: Buffer[][],
        value_bins: Buffer[][],
        currentNode: TreeNode,
        height: number,
        h: number
	): Promise<[TreeNode[], number[]]> {

        const totalData = key_bins.map ( kb => kb.length).reduce((a,b)=>a+b);
        if (totalData === 0)
            return [[currentNode], [h]];
        
        if ((currentNode instanceof Empty) && totalData === 1) {
            const idx = key_bins.findIndex(el => el.length === 1);
            const new_leaf = Leaf.fromData(key_bins[idx][0], value_bins[idx][0]);
            return [[new_leaf], [h]];
        }
            
        // If we are at the bottom of the tree, we call update_subtree and return update nodes
        if (h === this.subtreeHeight) {
            let btmSubtree: SubTree;
            if (currentNode instanceof Branch) {
                btmSubtree = await this.getSubTree(currentNode.hash);
                await this._db.del(currentNode.hash);
            } else if (currentNode instanceof Empty) {
                btmSubtree = await this.getSubTree(currentNode.hash);
            } else if (currentNode instanceof Leaf) {
                btmSubtree = SubTree.fromData([0], [currentNode]);
            } else
                throw new Error('Invalid data.');

            const new_subtree = await this._updateSubtree(key_bins[0], value_bins[0], btmSubtree, height + h);
            return [[Branch.fromData(new_subtree.hash)], [h]];

        }
        
        // Else, we just call _updateNode and return the returned values
        let left_node, right_node;
        if (currentNode instanceof Empty) {
            left_node = new Empty();
            right_node = new Empty();
        } else if (currentNode instanceof Leaf) {
            if (isBitSet(currentNode.key, height + h)) {
                left_node = new Empty();
                right_node = currentNode;
            } else {
                left_node = currentNode;
                right_node = new Empty();
            }
        } else
            throw new Error('Invalid data.');

        const idx = Math.floor(key_bins.length/2);
        const [leftNodes, leftHeights] = await this._updateNode(
            key_bins.slice(0, idx), value_bins.slice(0, idx), left_node, height, h + 1
        );
        const [rightNodes, rightHeights] = await this._updateNode(
            key_bins.slice(idx), value_bins.slice(idx), right_node, height, h + 1
        );

        leftNodes.push(... rightNodes);
        leftHeights.push(... rightHeights);

        return [leftNodes, leftHeights];


    }

    // public async remove(keys: Buffer[]): Promise<SubTree> {
    //     if (keys.length === 0) {
    //         return await this.getSubTree(this._rootHash);
    //     }

    //     if (keys[0].length !== this.keyLength) {
    //         throw new Error(`Key is not equal to defined key length of ${this.keyLength}`);
    //     }

    //     const root = await this.getSubTree(this._rootHash);
    //     const newRoot = await this._remove(keys, root, 0);
	// 	this._rootHash = newRoot.hash;

	// 	return newRoot;

    // }
    
    // private async _remove(keys: Buffer[], currentSubtree: SubTree, height: number): Promise<SubTree> {
    //     if (keys.length === 0)
    //         return currentSubtree

    //     const bin_keys: Buffer[][] = [];
        
    //     for (let _ = 0; _ < keys.length; _++) {
    //         bin_keys.push([]);
    //     }

    //     const b = Math.floor(height/8);
    //     for (let i = 0; i < keys.length; i++) {
    //         const k = keys[i];
    //         let bin_idx;
    //         if (height%8 === 0) 
    //             bin_idx = k[b] >> 4;
    //         else if (height%8 === 4)
    //             bin_idx = k[b] & 15;
    //         else
    //             throw new Error('Invalid key.')

    //         bin_keys[bin_idx].push(k)
    //     }
            

    //     const new_nodes: TreeNode[] = [];
    //     const new_structure: number[] = [];
    // }


}



