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

import { codec } from '@liskhq/lisk-codec';
import { ModuleEndpointContext } from '../../types';
import { BaseEndpoint } from '../base_endpoint';
import { STORE_PREFIX_DELEGATE, STORE_PREFIX_VOTER } from './constants';
import { voterStoreSchema, delegateStoreSchema } from './schemas';
import { DelegateAccount, DelegateAccountJSON, VoterData, VoterDataJSON } from './types';

export class DPoSEndpoint extends BaseEndpoint {
	public async getVoter(ctx: ModuleEndpointContext): Promise<VoterDataJSON> {
		const voterSubStore = ctx.getStore(this.moduleID, STORE_PREFIX_VOTER);
		const { address } = ctx.params;
		if (typeof address !== 'string') {
			throw new Error('Parameter address must be a string.');
		}
		const voterData = await voterSubStore.getWithSchema<VoterData>(
			Buffer.from(address, 'hex'),
			voterStoreSchema,
		);

		return codec.toJSON(voterStoreSchema, voterData);
	}

	public async getDelegate(ctx: ModuleEndpointContext): Promise<DelegateAccountJSON> {
		const delegateSubStore = ctx.getStore(this.moduleID, STORE_PREFIX_DELEGATE);
		const { address } = ctx.params;
		if (typeof address !== 'string') {
			throw new Error('Parameter address must be a string.');
		}
		const delegate = await delegateSubStore.getWithSchema<DelegateAccount>(
			Buffer.from(address, 'hex'),
			delegateStoreSchema,
		);

		return {
			...delegate,
			totalVotesReceived: delegate.totalVotesReceived.toString(),
			selfVotes: delegate.selfVotes.toString(),
		};
	}

	public async getAllDelegates(ctx: ModuleEndpointContext): Promise<DelegateAccountJSON[]> {
		const delegateSubStore = ctx.getStore(this.moduleID, STORE_PREFIX_DELEGATE);
		const startBuf = Buffer.alloc(20);
		const endBuf = Buffer.alloc(20, 255);
		const storeData = await delegateSubStore.iterate({ start: startBuf, end: endBuf });

		const response = [];
		for (const data of storeData) {
			const delegate = await delegateSubStore.getWithSchema<DelegateAccount>(
				data.key,
				delegateStoreSchema,
			);
			const delegateJSON = {
				...delegate,
				totalVotesReceived: delegate.totalVotesReceived.toString(),
				selfVotes: delegate.selfVotes.toString(),
			};
			response.push(delegateJSON);
		}

		return response;
	}
}
