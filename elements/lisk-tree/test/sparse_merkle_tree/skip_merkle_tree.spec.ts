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

import { InMemoryDB } from '../../src/inmemory_db';
import { SkipMerkleTree } from '../../src/skip_merkle_tree/skip_merkle_tree';
import { Database } from '../../src/skip_merkle_tree/types';
import * as fixtures from '../fixtures/sparse_merkle_tree/update_tree.json';
import * as SMTFixtures from '../fixtures/sparse_merkle_tree/smt_fixtures.json';

describe('SkipMerkleTree', () => {
	describe('constructor', () => {});

	describe('update', () => {
		let db: Database;
		let smt: SkipMerkleTree;

		beforeEach(() => {
			db = new InMemoryDB();
			smt = new SkipMerkleTree({ db, keyLength: 32 });
		});

		for (const test of fixtures.testCases.slice(0, 1)) {
			// eslint-disable-next-line no-loop-func
			it(test.description, async () => {
				const inputKeys = test.input.keys;
				const inputValues = test.input.values;
				const outputMerkleRoot = test.output.merkleRoot;

				await smt.update(
					inputKeys.map(v => Buffer.from(v, 'hex')),
					inputValues.map(v => Buffer.from(v, 'hex')),
				);

				expect(smt.rootHash.toString('hex')).toEqual(outputMerkleRoot);
			});
		}

		for (const test of SMTFixtures.testCases.slice(0, 1)) {
			// eslint-disable-next-line no-loop-func
			it(test.description, async () => {
				const inputKeys = test.input.keys;
				const inputValues = test.input.values;
				const outputMerkleRoot = test.output.merkleRoot;

				await smt.update(
					inputKeys.map(v => Buffer.from(v, 'hex')),
					inputValues.map(v => Buffer.from(v, 'hex')),
				);

				expect(smt.rootHash.toString('hex')).toEqual(outputMerkleRoot);
			});
		}
	});
});
