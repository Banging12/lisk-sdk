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

        const binKeys: Buffer[][] = [];
        const binValues: Buffer[][] = [];

        for (let i = 0; i < this.numberOfNodes; i+=1) {
            binKeys.push([]);
            binValues.push([]);
        }

        const b = Math.floor(height/8);
        for (let i = 0; i < keys.length; i+=1) {
            const k = keys[i];
            const v = values[i];
            let binIdx;
            if (height%8 === 0) 
                binIdx = k[b] >> 4;
            else if (height%8 === 4)
                binIdx = k[b] & 15;
            else
                throw new Error('Invalid key.')
                
            binKeys[binIdx].push(k)
            binValues[binIdx].push(v)
        }
            

        const newNodes: TreeNode[] = [];
        const newStructure: number[] = [];

        let V = 0;

        for (let i = 0; i < currentSubtree.nodes.length; i+=1) {
            const h = currentSubtree.structure[i];
            const currentNode = currentSubtree.nodes[i];
            const incr = 1 << (this.subtreeHeight - h);

            const [_nodes, _heights] = await this._updateNode(
                binKeys.slice(V, V + incr), binValues.slice(V, V + incr), currentNode, height, h
            )
            newNodes.push(... _nodes);
            newStructure.push(... _heights);
            V += incr
        }

        if (V !== this.numberOfNodes) {
            throw new Error('Invalid number of Nodes.');
        }


        const newSubTree = SubTree.fromData(newStructure, newNodes);
        await this._db.set(newSubTree.hash, newSubTree.data);
        return newSubTree;
    }

    private async _updateNode(
		keyBins: Buffer[][],
        valueBins: Buffer[][],
        currentNode: TreeNode,
        height: number,
        h: number
	): Promise<[TreeNode[], number[]]> {

        const totalData = keyBins.map ( kb => kb.length).reduce((a,b)=>a+b);
        if (totalData === 0)
            return [[currentNode], [h]];
        
        if ((currentNode instanceof Empty) && totalData === 1) {
            const idx = keyBins.findIndex(el => el.length === 1);
            const newLeaf = Leaf.fromData(keyBins[idx][0], valueBins[idx][0]);
            return [[newLeaf], [h]];
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

            const newSubTree = await this._updateSubtree(keyBins[0], valueBins[0], btmSubtree, height + h);
            return [[Branch.fromData(newSubTree.hash)], [h]];

        }
        
        // Else, we just call _updateNode and return the returned values
        let leftNode, rightNode;
        if (currentNode instanceof Empty) {
            leftNode = new Empty();
            rightNode = new Empty();
        } else if (currentNode instanceof Leaf) {
            if (isBitSet(currentNode.key, height + h)) {
                leftNode = new Empty();
                rightNode = currentNode;
            } else {
                leftNode = currentNode;
                rightNode = new Empty();
            }
        } else
            throw new Error('Invalid data.');

        const idx = Math.floor(keyBins.length/2);
        const [leftNodes, leftHeights] = await this._updateNode(
            keyBins.slice(0, idx), valueBins.slice(0, idx), leftNode, height, h + 1
        );
        const [rightNodes, rightHeights] = await this._updateNode(
            keyBins.slice(idx), valueBins.slice(idx), rightNode, height, h + 1
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

    //     const binKeys: Buffer[][] = [];
        
    //     for (let _ = 0; _ < keys.length; _++) {
    //         binKeys.push([]);
    //     }

    //     const b = Math.floor(height/8);
    //     for (let i = 0; i < keys.length; i++) {
    //         const k = keys[i];
    //         let binIdx;
    //         if (height%8 === 0) 
    //             binIdx = k[b] >> 4;
    //         else if (height%8 === 4)
    //             binIdx = k[b] & 15;
    //         else
    //             throw new Error('Invalid key.')

    //         binKeys[binIdx].push(k)
    //     }
            

    //     const newNodes: TreeNode[] = [];
    //     const newStructure: number[] = [];
    // }


}



