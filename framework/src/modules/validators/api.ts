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

import { blsPopVerify } from '@liskhq/lisk-cryptography';
import { BaseAPI } from '../base_api';
import { APIContext, ImmutableAPIContext } from '../../node/state_machine';
import {
	EMPTY_KEY,
	INVALID_BLS_KEY,
	STORE_PREFIX_BLS_KEYS,
	STORE_PREFIX_GENERATOR_LIST,
	STORE_PREFIX_GENESIS_DATA,
	STORE_PREFIX_VALIDATORS_DATA,
} from './constants';
import { APIInitArgs, GeneratorList, GenesisData, ValidatorKeys } from './types';
import {
	generatorListSchema,
	genesisDataSchema,
	validatorAccountSchema,
	validatorAddressSchema,
} from './schemas';

export class ValidatorsAPI extends BaseAPI {
	private _blockTime!: number;

	public init(args: APIInitArgs) {
		this._blockTime = args.config.blockTime;
	}

	public async getGeneratorAtTimestamp(
		apiContext: ImmutableAPIContext,
		timestamp: number,
	): Promise<Buffer> {
		const genesisData = await this.getGenesisData(apiContext);

		if (timestamp < genesisData.timestamp) {
			throw new Error('Input timestamp must be greater than genesis timestamp.');
		}

		const elapsedTime = timestamp - genesisData.timestamp;

		const generatorListSubStore = apiContext.getStore(this.moduleID, STORE_PREFIX_GENERATOR_LIST);
		const generatorList = await generatorListSubStore.getWithSchema<GeneratorList>(
			EMPTY_KEY,
			generatorListSchema,
		);
		const slotIndex = Math.floor(elapsedTime / this._blockTime) % generatorList.addresses.length;
		return generatorList.addresses[slotIndex];
	}

	public async getSlotNumber(apiContext: ImmutableAPIContext, timestamp: number): Promise<number> {
		const genesisData = await this.getGenesisData(apiContext);

		if (timestamp < genesisData.timestamp) {
			throw new Error('Input timestamp must be greater than genesis timestamp.');
		}

		const elapsedTime = timestamp - genesisData.timestamp;
		return Math.floor(elapsedTime / this._blockTime);
	}

	public async getSlotTime(apiContext: ImmutableAPIContext, slotNumber: number): Promise<number> {
		if (slotNumber < 0) {
			throw new Error('Input slot number must be positive.');
		}
		const slotGenesisTimeOffset = slotNumber * this._blockTime;
		const genesisData = await this.getGenesisData(apiContext);
		return genesisData.timestamp + slotGenesisTimeOffset;
	}

	public async registerValidatorKeys(
		apiContext: APIContext,
		validatorAddress: Buffer,
		blsKey: Buffer,
		generatorKey: Buffer,
		proofOfPossession: Buffer,
	): Promise<boolean> {
		const validatorsSubStore = apiContext.getStore(this.moduleID, STORE_PREFIX_VALIDATORS_DATA);

		const addressExists = await validatorsSubStore.has(validatorAddress);
		if (addressExists) {
			return false;
		}

		const blsKeysSubStore = apiContext.getStore(this.moduleID, STORE_PREFIX_BLS_KEYS);
		const blsKeyExists = await blsKeysSubStore.has(blsKey);
		if (blsKeyExists) {
			return false;
		}

		if (!blsPopVerify(blsKey, proofOfPossession)) {
			return false;
		}

		const validatorAccount = {
			generatorKey,
			blsKey,
		};

		await validatorsSubStore.setWithSchema(
			validatorAddress,
			validatorAccount,
			validatorAccountSchema,
		);
		await blsKeysSubStore.setWithSchema(
			blsKey,
			{ address: validatorAddress },
			validatorAddressSchema,
		);

		return true;
	}

	public async getValidatorAccount(
		apiContext: ImmutableAPIContext,
		address: Buffer,
	): Promise<ValidatorKeys> {
		const validatorsSubStore = apiContext.getStore(this.moduleID, STORE_PREFIX_VALIDATORS_DATA);
		return validatorsSubStore.getWithSchema<ValidatorKeys>(address, validatorAccountSchema);
	}

	public async getGenesisData(apiContext: ImmutableAPIContext): Promise<GenesisData> {
		const genesisDataSubStore = apiContext.getStore(this.moduleID, STORE_PREFIX_GENESIS_DATA);
		return genesisDataSubStore.getWithSchema<GenesisData>(EMPTY_KEY, genesisDataSchema);
	}

	public async setValidatorBLSKey(
		apiContext: APIContext,
		validatorAddress: Buffer,
		blsKey: Buffer,
		proofOfPossession: Buffer,
	): Promise<boolean> {
		const validatorsSubStore = apiContext.getStore(this.moduleID, STORE_PREFIX_VALIDATORS_DATA);

		const addressExists = await validatorsSubStore.has(validatorAddress);
		if (!addressExists) {
			return false;
		}

		const blsKeysSubStore = apiContext.getStore(this.moduleID, STORE_PREFIX_BLS_KEYS);
		const blsKeyExists = await blsKeysSubStore.has(blsKey);
		if (blsKeyExists) {
			return false;
		}

		const validatorAccount = await validatorsSubStore.getWithSchema<ValidatorKeys>(
			validatorAddress,
			validatorAccountSchema,
		);
		if (!validatorAccount.blsKey.equals(INVALID_BLS_KEY)) {
			return false;
		}

		if (!blsPopVerify(blsKey, proofOfPossession)) {
			return false;
		}

		validatorAccount.blsKey = blsKey;
		await validatorsSubStore.setWithSchema(
			validatorAddress,
			validatorAccount,
			validatorAccountSchema,
		);
		await blsKeysSubStore.setWithSchema(
			blsKey,
			{ address: validatorAddress },
			validatorAddressSchema,
		);

		return true;
	}

	public async setValidatorGeneratorKey(
		apiContext: APIContext,
		validatorAddress: Buffer,
		generatorKey: Buffer,
	): Promise<boolean> {
		const validatorsSubStore = apiContext.getStore(this.moduleID, STORE_PREFIX_VALIDATORS_DATA);

		const addressExists = await validatorsSubStore.has(validatorAddress);
		if (!addressExists) {
			return false;
		}

		const validatorAccount = await validatorsSubStore.getWithSchema<ValidatorKeys>(
			validatorAddress,
			validatorAccountSchema,
		);
		validatorAccount.generatorKey = generatorKey;
		await validatorsSubStore.setWithSchema(
			validatorAddress,
			validatorAccount,
			validatorAccountSchema,
		);

		return true;
	}

	public async isKeyRegistered(apiContext: ImmutableAPIContext, blsKey: Buffer): Promise<boolean> {
		const blsKeysSubStore = apiContext.getStore(this.moduleID, STORE_PREFIX_BLS_KEYS);
		return blsKeysSubStore.has(blsKey);
	}

	public async getGeneratorList(apiContext: ImmutableAPIContext): Promise<Buffer[]> {
		const generatorListSubStore = apiContext.getStore(this.moduleID, STORE_PREFIX_GENERATOR_LIST);
		const generatorList = await generatorListSubStore.getWithSchema<GeneratorList>(
			EMPTY_KEY,
			generatorListSchema,
		);

		return generatorList.addresses;
	}

	public async setGeneratorList(
		apiContext: APIContext,
		generatorAddresses: Buffer[],
	): Promise<boolean> {
		const generatorListSubStore = apiContext.getStore(this.moduleID, STORE_PREFIX_GENERATOR_LIST);
		const validatorsSubStore = apiContext.getStore(this.moduleID, STORE_PREFIX_VALIDATORS_DATA);

		for (const addr of generatorAddresses) {
			const addressExists = await validatorsSubStore.has(addr);
			if (!addressExists) {
				return false;
			}
		}

		await generatorListSubStore.setWithSchema(
			EMPTY_KEY,
			{ addresses: generatorAddresses },
			generatorListSchema,
		);
		return true;
	}

	public async getGeneratorsBetweenTimestamps(
		apiContext: ImmutableAPIContext,
		startTimestamp: number,
		endTimestamp: number,
	): Promise<Record<string, number>> {
		if (endTimestamp < startTimestamp) {
			throw new Error('End timestamp must be greater than start timestamp.');
		}

		const result: Record<string, number> = {};
		const genesisData = await this.getGenesisData(apiContext);

		if (startTimestamp < genesisData.timestamp) {
			throw new Error('Input timestamp must be greater than genesis timestamp.');
		}

		const startSlotNumber = Math.floor((startTimestamp - genesisData.timestamp) / this._blockTime);
		const endSlotNumber = Math.floor((endTimestamp - genesisData.timestamp) / this._blockTime);
		let totalSlots = endSlotNumber - startSlotNumber + 1;

		const generatorListSubStore = apiContext.getStore(this.moduleID, STORE_PREFIX_GENERATOR_LIST);
		const generatorList = await generatorListSubStore.getWithSchema<GeneratorList>(
			EMPTY_KEY,
			generatorListSchema,
		);
		const generatorAddresses = generatorList.addresses.map(buf => buf.toString('binary'));
		const baseSlots = Math.floor(totalSlots / generatorAddresses.length);

		if (baseSlots > 0) {
			totalSlots -= baseSlots * generatorAddresses.length;
			for (const generatorAddress of generatorAddresses) {
				result[generatorAddress] = baseSlots;
			}
		}

		for (
			let slotNumber = startSlotNumber;
			slotNumber < startSlotNumber + totalSlots;
			slotNumber += 1
		) {
			const slotIndex = slotNumber % generatorAddresses.length;
			const generatorAddress = generatorAddresses[slotIndex];
			if (Object.prototype.hasOwnProperty.call(result, generatorAddress)) {
				result[generatorAddress] += 1;
			} else {
				result[generatorAddress] = 1;
			}
		}

		return result;
	}
}
