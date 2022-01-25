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

import { BATCH_HEIGHT } from './constants';

export class Position {
	private readonly _height: number;
	private _index: number;

	public constructor(height: number, index: number) {
		this._height = height;
		this._index = index;
	}

	public key(): string {
		const key = Buffer.alloc(4);
		key.writeUInt16BE(this._height, 0);
		key.writeUInt16BE(this._index, 2);
		return key.toString('binary');
	}

	public get height(): number {
		return this._height;
	}

	public get index(): number {
		return this._index;
	}

	public left(): Position {
		return new Position(this._height + 1, this._index * 2 + 1);
	}

	public right(): Position {
		return new Position(this._height + 1, this._index * 2 + 2);
	}

	public up(): Position {
		return new Position(this._height - 1, Math.floor((this._index - 1) / 2));
	}

	public root(): Position {
		let root: Position = new Position(this._height, this.index);
		while (root.height % BATCH_HEIGHT !== 0) {
			root = root.up();
		}
		return root;
	}

	public isRoot(): boolean {
		return this._height % BATCH_HEIGHT === 0;
	}

	public resetIndex(): void {
		this._index = 0;
	}
}
