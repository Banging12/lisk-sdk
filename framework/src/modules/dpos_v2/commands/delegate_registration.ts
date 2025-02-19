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

import { validator, LiskValidationError } from '@liskhq/lisk-validator';
import {
	CommandVerifyContext,
	VerificationResult,
	VerifyStatus,
	CommandExecuteContext,
} from '../../../node/state_machine/types';
import { BaseCommand } from '../../base_command';
import {
	COMMAND_ID_DELEGATE_REGISTRATION,
	MODULE_ID_DPOS,
	STORE_PREFIX_DELEGATE,
	STORE_PREFIX_NAME,
} from '../constants';
import {
	delegateRegistrationCommandParamsSchema,
	delegateStoreSchema,
	nameStoreSchema,
} from '../schemas';
import { DelegateRegistrationParams, ValidatorsAPI } from '../types';
import { isUsername } from '../utils';

export class DelegateRegistrationCommand extends BaseCommand {
	public id = COMMAND_ID_DELEGATE_REGISTRATION;
	public name = 'registerDelegate';
	public schema = delegateRegistrationCommandParamsSchema;
	private _validatorsAPI!: ValidatorsAPI;

	public addDependencies(validatorsAPI: ValidatorsAPI) {
		this._validatorsAPI = validatorsAPI;
	}

	public async verify(
		context: CommandVerifyContext<DelegateRegistrationParams>,
	): Promise<VerificationResult> {
		const { transaction } = context;

		const errors = validator.validate(delegateRegistrationCommandParamsSchema, context.params);

		if (errors.length > 0) {
			return {
				status: VerifyStatus.FAIL,
				error: new LiskValidationError(errors),
			};
		}

		if (!isUsername(context.params.name)) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error(`'name' is in an unsupported format: ${context.params.name}`),
			};
		}

		const nameSubstore = context.getStore(MODULE_ID_DPOS, STORE_PREFIX_NAME);
		const nameExists = await nameSubstore.has(Buffer.from(context.params.name, 'utf8'));

		if (nameExists) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error('Name substore must not have an entry for the store key name'),
			};
		}

		const delegateSubstore = context.getStore(MODULE_ID_DPOS, STORE_PREFIX_DELEGATE);
		const delegateExists = await delegateSubstore.has(transaction.senderAddress);

		if (delegateExists) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error('Delegate substore must not have an entry for the store key address'),
			};
		}

		return {
			status: VerifyStatus.OK,
		};
	}

	public async execute(context: CommandExecuteContext<DelegateRegistrationParams>): Promise<void> {
		const {
			transaction,
			params: { name, blsKey, generatorKey, proofOfPossession },
			header: { height },
		} = context;
		const apiContext = context.getAPIContext();

		const isRegistered = await this._validatorsAPI.registerValidatorKeys(
			apiContext,
			transaction.senderAddress,
			blsKey,
			generatorKey,
			proofOfPossession,
		);

		if (!isRegistered) {
			throw new Error('Failed to register validator keys');
		}

		const delegateSubstore = context.getStore(MODULE_ID_DPOS, STORE_PREFIX_DELEGATE);
		await delegateSubstore.setWithSchema(
			transaction.senderAddress,
			{
				name,
				totalVotesReceived: BigInt(0),
				selfVotes: BigInt(0),
				lastGeneratedHeight: height,
				isBanned: false,
				pomHeights: [],
				consecutiveMissedBlocks: 0,
			},
			delegateStoreSchema,
		);

		const nameSubstore = context.getStore(MODULE_ID_DPOS, STORE_PREFIX_NAME);
		await nameSubstore.setWithSchema(
			Buffer.from(name, 'utf8'),
			{ delegateAddress: transaction.senderAddress },
			nameStoreSchema,
		);
	}
}
