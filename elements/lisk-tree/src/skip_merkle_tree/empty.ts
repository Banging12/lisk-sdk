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

import { EMPTY_HASH, EMPTY_PLACEHOLDER_PREFIX } from './constants';

export class Empty {
	private readonly _hash = EMPTY_HASH;

	public get hash() {
		return this._hash;
	}

    public get data() {
        return EMPTY_PLACEHOLDER_PREFIX;
    }
}
