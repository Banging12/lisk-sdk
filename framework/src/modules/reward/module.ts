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

import { objects } from '@liskhq/lisk-utils';
import { LiskValidationError, validator } from '@liskhq/lisk-validator';
import { BaseModule, ModuleInitArgs } from '../base_module';
import { defaultConfig, MODULE_ID_REWARD } from './constants';
import { BFTAPI, ModuleConfig, RandomAPI, TokenAPI, TokenIDReward } from './types';
import { BlockAfterExecuteContext } from '../../node/state_machine';
import { RewardAPI } from './api';
import { RewardEndpoint } from './endpoint';
import { configSchema } from './schemas';

export class RewardModule extends BaseModule {
	public id = MODULE_ID_REWARD;
	public name = 'reward';
	public api = new RewardAPI(this.id);
	public configSchema = configSchema;
	public endpoint = new RewardEndpoint(this.id);
	private _tokenAPI!: TokenAPI;
	private _bftAPI!: BFTAPI;
	private _randomAPI!: RandomAPI;
	private _tokenIDReward!: TokenIDReward;
	private _moduleConfig!: ModuleConfig;

	public addDependencies(tokenAPI: TokenAPI, randomAPI: RandomAPI, bftAPI: BFTAPI) {
		this._tokenAPI = tokenAPI;
		this._randomAPI = randomAPI;
		this._bftAPI = bftAPI;
		this.api.addDependencies(this._bftAPI, this._randomAPI);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async init(args: ModuleInitArgs): Promise<void> {
		const { moduleConfig } = args;
		const config = objects.mergeDeep({}, defaultConfig, moduleConfig);
		const errors = validator.validate(configSchema, config);
		if (errors.length) {
			throw new LiskValidationError(errors);
		}
		this._moduleConfig = (config as unknown) as ModuleConfig;
		this._tokenIDReward = this._moduleConfig.tokenIDReward;

		this.api.init({
			config: {
				brackets: this._moduleConfig.brackets.map(bracket => BigInt(bracket)),
				offset: this._moduleConfig.offset,
				distance: this._moduleConfig.distance,
			},
		});

		this.endpoint.init({
			config: {
				brackets: this._moduleConfig.brackets.map(bracket => BigInt(bracket)),
				offset: this._moduleConfig.offset,
				distance: this._moduleConfig.distance,
			},
		});
	}

	public async afterTransactionsExecute(context: BlockAfterExecuteContext): Promise<void> {
		const blockReward = await this.api.getBlockReward(
			context.getAPIContext(),
			context.header,
			context.assets,
		);

		if (blockReward <= BigInt(0)) {
			return;
		}

		await this._tokenAPI.mint(
			context.getAPIContext(),
			context.header.generatorAddress,
			this._tokenIDReward,
			blockReward,
		);
	}
}
