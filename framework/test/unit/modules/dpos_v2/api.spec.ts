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

import { StateStore } from '@liskhq/lisk-chain';
import { getRandomBytes } from '@liskhq/lisk-cryptography';
import { InMemoryKVStore } from '@liskhq/lisk-db';
import { DPoSAPI } from '../../../../src/modules/dpos_v2/api';
import {
	MODULE_ID_DPOS,
	STORE_PREFIX_DELEGATE,
	STORE_PREFIX_NAME,
	STORE_PREFIX_VOTER,
} from '../../../../src/modules/dpos_v2/constants';
import {
	delegateStoreSchema,
	nameStoreSchema,
	voterStoreSchema,
} from '../../../../src/modules/dpos_v2/schemas';
import { APIContext } from '../../../../src/node/state_machine/api_context';
import { EventQueue } from '../../../../src/node/state_machine';

describe('DposModuleApi', () => {
	let dposAPI: DPoSAPI;
	let apiContext: APIContext;
	let stateStore: StateStore;
	let voterSubStore: StateStore;
	let delegateSubStore: StateStore;
	let nameSubStore: StateStore;
	const address = getRandomBytes(20);
	const voterData = {
		sentVotes: [
			{
				delegateAddress: getRandomBytes(20),
				amount: BigInt(0),
			},
		],
		pendingUnlocks: [
			{
				delegateAddress: getRandomBytes(20),
				amount: BigInt(0),
				unvoteHeight: 0,
			},
		],
	};

	const delegateData = {
		name: 'delegate1',
		totalVotesReceived: BigInt(0),
		selfVotes: BigInt(0),
		lastGeneratedHeight: 0,
		isBanned: false,
		pomHeights: [0],
		consecutiveMissedBlocks: 0,
	};

	beforeEach(() => {
		dposAPI = new DPoSAPI(MODULE_ID_DPOS);
		stateStore = new StateStore(new InMemoryKVStore());
		voterSubStore = stateStore.getStore(dposAPI['moduleID'], STORE_PREFIX_VOTER);
		delegateSubStore = stateStore.getStore(dposAPI['moduleID'], STORE_PREFIX_DELEGATE);
		nameSubStore = stateStore.getStore(dposAPI['moduleID'], STORE_PREFIX_NAME);
	});

	describe('isNameAvailable', () => {
		describe('when name already exists', () => {
			it('should return false', async () => {
				await nameSubStore.setWithSchema(Buffer.from(delegateData.name), {}, nameStoreSchema);
				apiContext = new APIContext({ stateStore, eventQueue: new EventQueue() });
				await expect(dposAPI.isNameAvailable(apiContext, delegateData.name)).resolves.toBeFalse();
			});
		});

		describe('when name does not exist and exceeds the maximum length', () => {
			it('should return false', async () => {
				apiContext = new APIContext({ stateStore, eventQueue: new EventQueue() });
				await expect(
					dposAPI.isNameAvailable(
						apiContext,
						'nnwkfnwkfnkwrnfkrnfeknekerfnkjenejnfekfnekfnjkdnwknw',
					),
				).resolves.toBeFalse();
			});
		});

		describe('when name does not exist and has length less than 1', () => {
			it('should return false', async () => {
				apiContext = new APIContext({ stateStore, eventQueue: new EventQueue() });
				await expect(dposAPI.isNameAvailable(apiContext, '')).resolves.toBeFalse();
			});
		});

		describe('when name does not exist and contains invalid symbol', () => {
			it('should return false', async () => {
				apiContext = new APIContext({ stateStore, eventQueue: new EventQueue() });
				await expect(
					dposAPI.isNameAvailable(apiContext, 'Ajldnfdf-_.dv$%&^#'),
				).resolves.toBeFalse();
			});
		});

		describe('when name does not exist and is a valid name', () => {
			it('should return true', async () => {
				apiContext = new APIContext({ stateStore, eventQueue: new EventQueue() });
				await expect(
					dposAPI.isNameAvailable(apiContext, 'abcdefghijklmnopqrstuvwxyz0123456789!@$&_.'),
				).resolves.toBeFalse();
			});
		});
	});

	describe('getVoter', () => {
		describe('when input address is valid', () => {
			it('should return correct voter data corresponding to the input address', async () => {
				await voterSubStore.setWithSchema(address, voterData, voterStoreSchema);
				apiContext = new APIContext({ stateStore, eventQueue: new EventQueue() });
				const voterDataReturned = await dposAPI.getVoter(apiContext, address);

				expect(voterDataReturned).toStrictEqual(voterData);
			});
		});
	});

	describe('getDelegate', () => {
		describe('when input address is valid', () => {
			it('should return correct delegate data corresponding to the input address', async () => {
				await delegateSubStore.setWithSchema(address, delegateData, delegateStoreSchema);
				apiContext = new APIContext({ stateStore, eventQueue: new EventQueue() });
				const delegateDataReturned = await dposAPI.getDelegate(apiContext, address);

				expect(delegateDataReturned).toStrictEqual(delegateData);
			});
		});
	});
});
