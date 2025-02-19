/*
 * Copyright © 2020 Lisk Foundation
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

import { codec } from '../src/codec';
import { buildTestCases, getAccountFromJSON } from './utils';

import { testCases as accountTestCases } from '../fixtures/account_decodings.json';
import { testCases as arrayTestCases } from '../fixtures/arrays_decodings.json';
import { testCases as blockAssetTestCases } from '../fixtures/block_asset_decodings.json';
import { testCases as blockTestCases } from '../fixtures/block_decodings.json';
import { testCases as blockHeaderTestCases } from '../fixtures/block_header_decodings.json';
import { testCases as booleanTestCases } from '../fixtures/boolean_decodings.json';
import { testCases as bytesTestCases } from '../fixtures/bytes_decodings.json';
import { testCases as cartSampleTestCases } from '../fixtures/cart_sample_decodings.json';
import { testCases as genesisBlockTestCases } from '../fixtures/genesis_block_decodings.json';
import { testCases as nestedArrayTestCases } from '../fixtures/nested_array_decodings.json';
import { testCases as numberTestCases } from '../fixtures/number_decodings.json';
import { testCases as objectsTestCases } from '../fixtures/objects_decodings.json';
import { testCases as peerInfoTestCases } from '../fixtures/peer_info_sample_decodings.json';
import { testCases as stringTestCases } from '../fixtures/string_decodings.json';
import { testCases as transactionTestCases } from '../fixtures/transaction_decodings.json';

describe('decode', () => {
	describe('account', () => {
		it.each(buildTestCases(accountTestCases))('%s', ({ input, output }) => {
			const object = getAccountFromJSON(output.object);

			const result = codec.decode(input.schema, Buffer.from(input.value, 'hex'));

			expect(result).toEqual(object);
		});
	});

	describe('array', () => {
		const isObjectArray = (x: any): x is { address: string; amount: string }[] =>
			typeof x[0] === 'object' && x[0].address;

		it.each(buildTestCases(arrayTestCases))('%s', ({ input, output }) => {
			let object: any = { ...output.object };

			if (isObjectArray(object.list)) {
				object = {
					list: object.list.map(
						(o: { address: string; amount: string | number | bigint | boolean }) => ({
							...o,
							amount: BigInt(o.amount),
						}),
					),
				};
			}

			const result = codec.decode(input.schema, Buffer.from(input.value, 'hex'));

			expect(result).toEqual(object);
		});
	});

	describe('block_asset', () => {
		it.each(buildTestCases(blockAssetTestCases))('%s', ({ input, output }) => {
			const object = {
				...output.object,
				seedReveal: Buffer.from(output.object.seedReveal, 'hex'),
			};

			const result = codec.decode(input.schema, Buffer.from(input.value, 'hex'));

			expect(result).toEqual(object);
		});
	});

	describe('block', () => {
		it.each(buildTestCases(blockTestCases))('%s', ({ input, output }) => {
			const object = {
				header: Buffer.from(output.object.header, 'hex'),
				transactions: output.object.transactions.map(p => Buffer.from(p, 'hex')),
			};

			const result = codec.decode(input.schema, Buffer.from(input.value, 'hex'));

			expect(result).toEqual(object);
		});
	});

	describe('block_header', () => {
		it.each(buildTestCases(blockHeaderTestCases))('%s', ({ input, output }) => {
			const object = {
				...output.object,
				previousBlockID: Buffer.from(output.object.previousBlockID, 'hex'),
				transactionRoot: Buffer.from(output.object.transactionRoot, 'hex'),
				generatorPublicKey: Buffer.from(output.object.generatorPublicKey, 'hex'),
				reward: BigInt(output.object.reward),
				asset: Buffer.from(output.object.asset, 'hex'),
				signature: Buffer.from(output.object.signature, 'hex'),
			};

			const result = codec.decode(input.schema, Buffer.from(input.value, 'hex'));

			expect(result).toEqual(object);
		});
	});

	describe('boolean', () => {
		it.each(buildTestCases(booleanTestCases))('%s', ({ input, output }) => {
			const result = codec.decode(input.schema, Buffer.from(input.value, 'hex'));

			expect(result).toEqual(output.object);
		});
	});

	describe('bytes', () => {
		it.each(buildTestCases(bytesTestCases))('%s', ({ input, output }) => {
			const object = {
				...output.object,
				address: Buffer.from(output.object.address, 'hex'),
			};

			const result = codec.decode(input.schema, Buffer.from(input.value, 'hex'));

			expect(result).toEqual(object);
		});
	});

	describe('cart_sample', () => {
		it.each(buildTestCases(cartSampleTestCases))('%s', ({ input, output }) => {
			const result = codec.decode(input.schema, Buffer.from(input.value, 'hex'));

			expect(result).toEqual(output.object);
		});
	});

	describe('genesis_block', () => {
		it.each(buildTestCases(genesisBlockTestCases))('%s', ({ input, output }) => {
			const object = {
				...output.object,
				initDelegates: output.object.initDelegates.map(d => Buffer.from(d, 'hex')),
				accounts: output.object.accounts.map(a => getAccountFromJSON(a)),
			};

			const result = codec.decode(input.schema, Buffer.from(input.value, 'hex'));

			expect(result).toEqual(object);
		});
	});

	describe('nested_array', () => {
		it.each(buildTestCases(nestedArrayTestCases))('%s', ({ input, output }) => {
			const result = codec.decode(input.schema, Buffer.from(input.value, 'hex'));

			expect(result).toEqual(output.object);
		});
	});

	describe('number', () => {
		it.each(buildTestCases(numberTestCases))('%s', ({ input, output }) => {
			const object = {
				...output.object,
				number:
					typeof output.object.number === 'string'
						? BigInt(output.object.number)
						: output.object.number,
			};

			const result = codec.decode(input.schema, Buffer.from(input.value, 'hex'));

			expect(result).toEqual(object);
		});
	});

	describe('objects', () => {
		it(objectsTestCases[0].description, () => {
			const testCase = objectsTestCases[0];
			const output = testCase.output as any;

			const object = {
				...output.object,
				address: Buffer.from(output.object.address, 'hex'),
				balance: BigInt(output.object.balance),
			};

			const result = codec.decode(testCase.input.schema, Buffer.from(testCase.input.value, 'hex'));

			expect(result).toEqual(object);
		});

		it(objectsTestCases[1].description, () => {
			const testCase = objectsTestCases[1];
			const output = testCase.output as any;

			const object = {
				...output.object,
				value: BigInt(output.object.value),
				data: Buffer.from(output.object.data, 'hex'),
			};

			const result = codec.decode(testCase.input.schema, Buffer.from(testCase.input.value, 'hex'));

			expect(result).toEqual(object);
		});
	});

	describe('peer info', () => {
		it.each(buildTestCases(peerInfoTestCases))('%s', ({ input, output }) => {
			const result = codec.decode(input.schema, Buffer.from(input.value, 'hex'));

			expect(result).toEqual(output.object);
		});
	});

	describe('string', () => {
		it.each(buildTestCases(stringTestCases))('%s', ({ input, output }) => {
			const result = codec.decode(input.schema, Buffer.from(input.value, 'hex'));

			expect(result).toEqual(output.object);
		});
	});

	describe('transaction', () => {
		// Base transaction
		it(transactionTestCases[0].description, () => {
			const testCase = transactionTestCases[0];
			const output = testCase.output as any;

			const object = {
				...output.object,
				nonce: BigInt(output.object.nonce),
				fee: BigInt(output.object.fee),
				senderPublicKey: Buffer.from(output.object.senderPublicKey, 'hex'),
				asset: Buffer.from(output.object.asset, 'hex'),
				signatures: output.object.signatures.map((s: string) => Buffer.from(s, 'hex')),
			};

			const result = codec.decode(testCase.input.schema, Buffer.from(testCase.input.value, 'hex'));

			expect(result).toEqual(object);
		});

		// vote asset
		it(transactionTestCases[1].description, () => {
			const testCase = transactionTestCases[1];
			const output = testCase.output as any;

			const object = {
				...output.object,
				votes: output.object.votes.map((v: any) => ({
					delegateAddress: Buffer.from(v.delegateAddress, 'hex'),
					amount: BigInt(v.amount),
				})),
			};

			const result = codec.decode(testCase.input.schema, Buffer.from(testCase.input.value, 'hex'));

			expect(result).toEqual(object);
		});

		// multisignature asset
		it(transactionTestCases[2].description, () => {
			const testCase = transactionTestCases[2];
			const output = testCase.output as any;

			const object = {
				...output.object,
				mandatoryKeys: output.object.mandatoryKeys.map((v: string) => Buffer.from(v, 'hex')),
				optionalKeys: output.object.optionalKeys.map((v: string) => Buffer.from(v, 'hex')),
			};

			const result = codec.decode(testCase.input.schema, Buffer.from(testCase.input.value, 'hex'));

			expect(result).toEqual(object);
		});

		// multisignature asset
		it(transactionTestCases[3].description, () => {
			const testCase = transactionTestCases[3];
			const output = testCase.output as any;

			const object = {
				...output.object,
				mandatoryKeys: output.object.mandatoryKeys.map((v: string) => Buffer.from(v, 'hex')),
				optionalKeys: output.object.optionalKeys.map((v: string) => Buffer.from(v, 'hex')),
			};

			const result = codec.decode(testCase.input.schema, Buffer.from(testCase.input.value, 'hex'));

			expect(result).toEqual(object);
		});
	});
});
