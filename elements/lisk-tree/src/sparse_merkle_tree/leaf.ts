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

import { hash } from '@liskhq/lisk-cryptography';
import { leafData } from './utils';

export class Leaf {
	private readonly _key: Buffer;
	private _value: Buffer;
	private _hash: Buffer;
	private _data: Buffer;

	public constructor(key: Buffer, value: Buffer) {
		this._key = key;
		this._value = value;
		this._data = leafData(this._key, this._value);
		this._hash = hash(this._data);
	}

	public static fromLeafData(data: Buffer): Leaf {
		const leaf = new Leaf(Buffer.alloc(0), Buffer.alloc(0));
		leaf._data = data;
		leaf._hash = hash(leaf._data);
		return leaf;
	}

	public get hash() {
		return this._hash;
	}
	public get key() {
		return this._key;
	}
	public get value() {
		return this._value;
	}
	public get data() {
		return this._data;
	}

	public update(newValue: Buffer) {
		this._value = newValue;
		this._data = leafData(this._key, this._value);
		this._hash = hash(this._data);
	}
}
