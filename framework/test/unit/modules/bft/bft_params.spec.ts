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

import { SMTStore, StateStore } from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import { BIG_ENDIAN, getRandomBytes, intToBuffer } from '@liskhq/lisk-cryptography';
import { InMemoryKVStore, KVStore } from '@liskhq/lisk-db';
import { SparseMerkleTree } from '@liskhq/lisk-tree';
import { MODULE_ID_BFT, STORE_PREFIX_BFT_PARAMETERS } from '../../../../src/modules/bft/constants';
import { BFTParameterNotFoundError } from '../../../../src/modules/bft/errors';
import {
	BFTParametersCache,
	deleteBFTParameters,
	getBFTParameters,
} from '../../../../src/modules/bft/bft_params';
import { BFTParameters, bftParametersSchema } from '../../../../src/modules/bft/schemas';

describe('BFT parameters', () => {
	describe('getBFTParameters', () => {
		let db: KVStore;
		let stateStore: StateStore;
		let bftParams1: BFTParameters;
		let bftParams2: BFTParameters;

		beforeEach(async () => {
			db = new InMemoryKVStore() as never;
			const rootStore = new StateStore(db);
			const paramsStore = rootStore.getStore(MODULE_ID_BFT, STORE_PREFIX_BFT_PARAMETERS);
			const height1Bytes = intToBuffer(309, 4, BIG_ENDIAN);
			bftParams1 = {
				prevoteThreshold: BigInt(20),
				precommitThreshold: BigInt(30),
				certificateThreshold: BigInt(40),
				validators: [
					{
						address: getRandomBytes(20),
						bftWeight: BigInt(10),
					},
				],
				validatorsHash: getRandomBytes(32),
			};
			await paramsStore.set(height1Bytes, codec.encode(bftParametersSchema, bftParams1));
			const height2Bytes = intToBuffer(515, 4, BIG_ENDIAN);
			bftParams2 = {
				prevoteThreshold: BigInt(40),
				precommitThreshold: BigInt(50),
				certificateThreshold: BigInt(60),
				validators: [
					{
						address: getRandomBytes(20),
						bftWeight: BigInt(5),
					},
				],
				validatorsHash: getRandomBytes(32),
			};
			await paramsStore.set(height2Bytes, codec.encode(bftParametersSchema, bftParams2));
			const batch = db.batch();
			const smtStore = new SMTStore(db);
			const smt = new SparseMerkleTree({ db: smtStore });
			await rootStore.finalize(batch, smt);
			await batch.write();

			stateStore = new StateStore(db);
		});

		it('should throw if BFT parameters lower than the height does not exist', async () => {
			const paramsStore = stateStore.getStore(MODULE_ID_BFT, STORE_PREFIX_BFT_PARAMETERS);

			await expect(getBFTParameters(paramsStore, 308)).rejects.toThrow(BFTParameterNotFoundError);
		});

		it('should return if BFT parameters equal to the input height exist', async () => {
			const paramsStore = stateStore.getStore(MODULE_ID_BFT, STORE_PREFIX_BFT_PARAMETERS);

			await expect(getBFTParameters(paramsStore, 514)).resolves.toEqual(bftParams1);
		});

		it('should return if BFT parameters lower than the input height exist', async () => {
			const paramsStore = stateStore.getStore(MODULE_ID_BFT, STORE_PREFIX_BFT_PARAMETERS);

			await expect(getBFTParameters(paramsStore, 1024)).resolves.toEqual(bftParams2);
		});
	});

	describe('deleteBFTParameters', () => {
		let db: KVStore;
		let stateStore: StateStore;
		let bftParams1: BFTParameters;
		let bftParams2: BFTParameters;

		beforeEach(async () => {
			db = new InMemoryKVStore() as never;
			const rootStore = new StateStore(db);
			const paramsStore = rootStore.getStore(MODULE_ID_BFT, STORE_PREFIX_BFT_PARAMETERS);
			const height1Bytes = intToBuffer(309, 4, BIG_ENDIAN);
			bftParams1 = {
				prevoteThreshold: BigInt(20),
				precommitThreshold: BigInt(30),
				certificateThreshold: BigInt(40),
				validators: [
					{
						address: getRandomBytes(20),
						bftWeight: BigInt(10),
					},
				],
				validatorsHash: getRandomBytes(32),
			};
			await paramsStore.set(height1Bytes, codec.encode(bftParametersSchema, bftParams1));
			const height2Bytes = intToBuffer(515, 4, BIG_ENDIAN);
			bftParams2 = {
				prevoteThreshold: BigInt(40),
				precommitThreshold: BigInt(50),
				certificateThreshold: BigInt(60),
				validators: [
					{
						address: getRandomBytes(20),
						bftWeight: BigInt(5),
					},
				],
				validatorsHash: getRandomBytes(32),
			};
			await paramsStore.set(height2Bytes, codec.encode(bftParametersSchema, bftParams2));
			const batch = db.batch();
			const smtStore = new SMTStore(db);
			const smt = new SparseMerkleTree({ db: smtStore });
			await rootStore.finalize(batch, smt);
			await batch.write();

			stateStore = new StateStore(db);
		});

		it('should not delete anything if the param does not exist for the heigt', async () => {
			const paramsStore = stateStore.getStore(MODULE_ID_BFT, STORE_PREFIX_BFT_PARAMETERS);
			jest.spyOn(paramsStore, 'del');
			await deleteBFTParameters(paramsStore, 308);

			expect(paramsStore.del).not.toHaveBeenCalled();
		});

		it('should delete all params strictly lower than height if the param exist for the heigt', async () => {
			const paramsStore = stateStore.getStore(MODULE_ID_BFT, STORE_PREFIX_BFT_PARAMETERS);
			jest.spyOn(paramsStore, 'del');
			await deleteBFTParameters(paramsStore, 515);

			expect(paramsStore.del).toHaveBeenCalledTimes(1);
			expect(paramsStore.del).toHaveBeenCalledWith(intToBuffer(309, 4, BIG_ENDIAN));
		});
	});

	describe('BFTParametersCache', () => {
		describe('cache', () => {
			let db: KVStore;

			it('should cache params for the specified range', async () => {
				db = new InMemoryKVStore() as never;
				const rootStore = new StateStore(db);
				const paramsStore = rootStore.getStore(MODULE_ID_BFT, STORE_PREFIX_BFT_PARAMETERS);
				const height1Bytes = intToBuffer(104, 4, BIG_ENDIAN);
				const bftParams1 = {
					prevoteThreshold: BigInt(20),
					precommitThreshold: BigInt(30),
					certificateThreshold: BigInt(40),
					validators: [
						{
							address: getRandomBytes(20),
							bftWeight: BigInt(10),
						},
					],
					validatorsHash: getRandomBytes(32),
				};
				await paramsStore.set(height1Bytes, codec.encode(bftParametersSchema, bftParams1));
				const height2Bytes = intToBuffer(207, 4, BIG_ENDIAN);
				const bftParams2 = {
					prevoteThreshold: BigInt(40),
					precommitThreshold: BigInt(50),
					certificateThreshold: BigInt(60),
					validators: [
						{
							address: getRandomBytes(20),
							bftWeight: BigInt(5),
						},
					],
					validatorsHash: getRandomBytes(32),
				};
				await paramsStore.set(height2Bytes, codec.encode(bftParametersSchema, bftParams2));
				const height3Bytes = intToBuffer(310, 4, BIG_ENDIAN);
				const bftParams3 = {
					prevoteThreshold: BigInt(40),
					precommitThreshold: BigInt(50),
					certificateThreshold: BigInt(60),
					validators: [
						{
							address: getRandomBytes(20),
							bftWeight: BigInt(5),
						},
					],
					validatorsHash: getRandomBytes(32),
				};
				await paramsStore.set(height3Bytes, codec.encode(bftParametersSchema, bftParams3));
				const batch = db.batch();
				const smtStore = new SMTStore(db);
				const smt = new SparseMerkleTree({ db: smtStore });
				await rootStore.finalize(batch, smt);
				await batch.write();

				const stateStore = new StateStore(db);
				const targetParamsStore = stateStore.getStore(MODULE_ID_BFT, STORE_PREFIX_BFT_PARAMETERS);
				jest.spyOn(targetParamsStore, 'iterate');

				const paramsCache = new BFTParametersCache(targetParamsStore);

				const start = 110;
				const end = 323;
				await paramsCache.cache(start, end);

				for (let i = start; i < end; i += 1) {
					await expect(paramsCache.getParameters(i)).toResolve();
				}
				await expect(paramsCache.getParameters(start)).resolves.toEqual(bftParams1);
				await expect(paramsCache.getParameters(207)).resolves.toEqual(bftParams2);
				await expect(paramsCache.getParameters(end)).resolves.toEqual(bftParams3);
				expect(targetParamsStore.iterate).toHaveBeenCalledTimes(2);
			});
		});
	});
});
