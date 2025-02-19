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
import { Chain } from '@liskhq/lisk-chain';
import { NotFoundError } from '@liskhq/lisk-db';
import { isHexString } from '@liskhq/lisk-validator';
import { BaseModule } from '../modules';
import { ModuleEndpointContext, RegisteredModule, RegisteredSchema } from '../types';
import { Consensus } from './consensus';
import { Generator } from './generator';
import { getRegisteredModules, getSchema } from './utils/modules';
import { NodeOptions } from './types';

interface EndpoinArgs {
	chain: Chain;
	consensus: Consensus;
	generator: Generator;
	options: NodeOptions;
}

interface InitArgs {
	registeredModules: BaseModule[];
}

export class Endpoint {
	[key: string]: unknown;
	private readonly _chain: Chain;
	private readonly _consensus: Consensus;
	private readonly _generator: Generator;
	private readonly _options: NodeOptions;
	private _registeredModules: BaseModule[] = [];

	public constructor(args: EndpoinArgs) {
		this._chain = args.chain;
		this._consensus = args.consensus;
		this._generator = args.generator;
		this._options = args.options;
	}

	public init(args: InitArgs) {
		this._registeredModules = args.registeredModules;
	}

	public async getBlockByID(context: ModuleEndpointContext): Promise<string | undefined> {
		const { id } = context.params;
		if (!isHexString(id)) {
			throw new Error('Invalid parameters. id must be a valid hex string.');
		}
		const block = await this._chain.dataAccess.getBlockByID(Buffer.from(id as string, 'hex'));
		return block.getBytes().toString('hex');
	}

	public async getBlocksByIDs(context: ModuleEndpointContext): Promise<readonly string[]> {
		const { ids } = context.params;
		if (!Array.isArray(ids) || ids.length === 0) {
			throw new Error('Invalid parameters. ids must be a non empty array.');
		}
		if (!ids.every(id => isHexString(id))) {
			throw new Error('Invalid parameters. id must a valid hex string.');
		}
		const blocks = [];
		try {
			for (const id of ids) {
				const block = await this._chain.dataAccess.getBlockByID(Buffer.from(id, 'hex'));
				blocks.push(block);
			}
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				throw error;
			}
		}
		return blocks.map(block => block.getBytes().toString('hex'));
	}
	public async getBlockByHeight(context: ModuleEndpointContext): Promise<string | undefined> {
		const { height } = context.params;
		if (typeof height !== 'number') {
			throw new Error('Invalid parameters. height must be a number.');
		}

		const block = await this._chain.dataAccess.getBlockByHeight(height);
		return block.getBytes().toString('hex');
	}

	public async getBlocksByHeightBetween(
		context: ModuleEndpointContext,
	): Promise<readonly string[]> {
		const { from, to } = context.params;
		if (typeof from !== 'number' || typeof to !== 'number') {
			throw new Error('Invalid parameters. from and to must be a number.');
		}
		const blocks = await this._chain.dataAccess.getBlocksByHeightBetween(from, to);

		return blocks.map(b => b.getBytes().toString('hex'));
	}

	public async getTransactionByID(context: ModuleEndpointContext): Promise<string> {
		const { id } = context.params;
		if (!isHexString(id)) {
			throw new Error('Invalid parameters. id must be a valid hex string.');
		}
		const transaction = await this._chain.dataAccess.getTransactionByID(
			Buffer.from(id as string, 'hex'),
		);
		return transaction.getBytes().toString('hex');
	}

	public async getTransactionsByIDs(context: ModuleEndpointContext): Promise<string[]> {
		const { ids } = context.params;
		if (!Array.isArray(ids) || ids.length === 0) {
			throw new Error('Invalid parameters. ids must be a non empty array.');
		}
		if (!ids.every(id => isHexString(id))) {
			throw new Error('Invalid parameters. id must a valid hex string.');
		}
		const transactions = [];
		try {
			for (const id of ids) {
				const transaction = await this._chain.dataAccess.getTransactionByID(Buffer.from(id, 'hex'));
				transactions.push(transaction);
			}
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				throw error;
			}
		}
		return transactions.map(tx => tx.getBytes().toString('hex'));
	}

	public getLastBlock(): string {
		return this._chain.lastBlock.getBytes().toString('hex');
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async getSchema(_context: ModuleEndpointContext): Promise<RegisteredSchema> {
		return getSchema(this._registeredModules);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async getRegisteredModules(_context: ModuleEndpointContext): Promise<RegisteredModule[]> {
		return getRegisteredModules(this._registeredModules);
	}

	public getNodeInfo(_context: ModuleEndpointContext) {
		return {
			version: this._options.version,
			networkVersion: this._options.networkVersion,
			networkIdentifier: this._chain.networkIdentifier.toString('hex'),
			lastBlockID: this._chain.lastBlock.header.id.toString('hex'),
			height: this._chain.lastBlock.header.height,
			finalizedHeight: this._consensus.finalizedHeight(),
			syncing: this._consensus.syncing(),
			unconfirmedTransactions: this._generator.getPooledTransactions().length,
			genesis: {
				...this._options.genesis,
			},
			registeredModules: getRegisteredModules(this._registeredModules),
			network: {
				port: this._options.network.port,
				hostIp: this._options.network.hostIp,
				seedPeers: this._options.network.seedPeers,
				blacklistedIPs: this._options.network.blacklistedIPs,
				fixedPeers: this._options.network.fixedPeers,
				whitelistedPeers: this._options.network.whitelistedPeers,
			},
		};
	}
}
