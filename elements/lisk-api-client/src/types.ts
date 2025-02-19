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
 *
 */

import { Schema } from '@liskhq/lisk-codec';

export interface Defer<T> {
	promise: Promise<T>;
	resolve: (result: T) => void;
	reject: (error?: Error) => void;
}

export interface JSONRPCNotification<T> {
	readonly id: never;
	readonly jsonrpc: string;
	readonly method: string;
	readonly params?: T;
}

export interface JSONRPCError {
	code: number;
	message: string;
	data?: string | number | boolean | Record<string, unknown>;
}

export interface JSONRPCResponse<T> {
	readonly id: number;
	readonly jsonrpc: string;
	readonly method: never;
	readonly params: never;
	readonly error?: JSONRPCError;
	readonly result?: T;
}

export type JSONRPCMessage<T> = JSONRPCNotification<T> | JSONRPCResponse<T>;

export type EventCallback<T = Record<string, unknown>> = (event?: T) => void | Promise<void>;

export interface Channel {
	connect: () => Promise<void>;
	disconnect: () => Promise<void>;
	invoke: <T>(actionName: string, params?: Record<string, unknown>) => Promise<T>;
	subscribe: (eventName: string, cb: EventCallback) => void;
}

export interface RegisteredSchemas {
	block: Schema;
	blockHeader: Schema;
	transaction: Schema;
	commands: {
		moduleID: number;
		moduleName: string;
		commandID: number;
		commandName: string;
		schema: Schema;
	}[];
}

export interface RegisteredModule {
	id: number;
	name: string;
	actions: string[];
	events: string[];
	commands: {
		id: number;
		name: string;
	}[];
}

export interface GenesisConfig {
	[key: string]: unknown;
	readonly bftThreshold: number;
	readonly communityIdentifier: string;
	readonly blockTime: number;
	readonly maxTransactionsSize: number;
	readonly rewards: {
		readonly milestones: string[];
		readonly offset: number;
		readonly distance: number;
	};
	readonly minFeePerByte: number;
	readonly baseFees: {
		readonly moduleID: number;
		readonly commandID: number;
		readonly baseFee: string;
	}[];
}

export interface NodeInfo {
	readonly version: string;
	readonly networkVersion: string;
	readonly networkIdentifier: string;
	readonly lastBlockID: string;
	readonly height: number;
	readonly genesisHeight: number;
	readonly finalizedHeight: number;
	readonly syncing: boolean;
	readonly unconfirmedTransactions: number;
	readonly genesisConfig: GenesisConfig;
	readonly registeredModules: RegisteredModule[];
	readonly network: {
		readonly port: number;
		readonly hostIp?: string;
		readonly seedPeers: {
			readonly ip: string;
			readonly port: number;
		}[];
		readonly blacklistedIPs?: string[];
		readonly fixedPeers?: string[];
		readonly whitelistedPeers?: {
			readonly ip: string;
			readonly port: number;
		}[];
	};
}

export interface MultiSignatureKeys {
	readonly mandatoryKeys: Buffer[];
	readonly optionalKeys: Buffer[];
	readonly numberOfSignatures: number;
}

export interface NetworkStats {
	[key: string]: unknown;
	readonly outgoing: {
		count: number;
		connects: number;
		disconnects: number;
	};
	readonly incoming: {
		count: number;
		connects: number;
		disconnects: number;
	};
	readonly banning: {
		count: number;
		bannedPeers: {
			[key: string]: {
				lastBanTime: number;
				banCount: number;
			};
		};
	};
	readonly totalConnectedPeers: number;
	readonly totalDisconnectedPeers: number;
	readonly totalErrors: number;
	readonly totalRemovedPeers: number;
	readonly totalMessagesReceived: {
		[key: string]: number;
	};
	readonly totalRequestsReceived: {
		[key: string]: number;
	};
	readonly totalPeersDiscovered: number;
	readonly startTime: number;
}

export interface PeerInfo {
	readonly ipAddress: string;
	readonly port: number;
	readonly networkIdentifier?: string;
	readonly networkVersion?: string;
	readonly nonce?: string;
	readonly options?: { [key: string]: unknown };
}

export interface Block<T = Buffer | string> {
	header: {
		[key: string]: unknown;
		id?: T;
		version: number;
	};
	assets: T[];
	transactions: {
		[key: string]: unknown;
		id?: T;
	}[];
}
