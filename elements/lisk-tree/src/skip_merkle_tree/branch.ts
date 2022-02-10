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

import { branchData } from './utils';

export class Branch {
	private _hash: Buffer;
	private _data: Buffer;

	public constructor(nodeHash: Buffer) {
		this._hash = nodeHash;
        this._data = branchData(this._hash);
	}

	public static fromData(nodeHash: Buffer): Branch {
		return new Branch(nodeHash);
	}

	public get hash() {
		return this._hash;
	}
	public get data() {
		return this._data;
	}

	public update(nodeHash: Buffer) {
		this._hash = nodeHash;
        this._data = branchData(this._hash);
	}
}
