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

export const randomModuleConfig = {
	$id: 'modules/random/config',
	type: 'object',
	required: ['maxLengthReveals'],
	properties: {
		maxLengthReveals: {
			type: 'integer',
			format: 'uint32',
		},
	},
};

export const randomModuleGeneratorConfig = {
	$id: 'modules/random/generator',
	type: 'object',
	required: [],
	properties: {
		hashOnions: {
			type: 'array',
			required: ['address', 'hashOnion'],
			items: {
				properties: {
					address: {
						type: 'string',
						format: 'hex',
					},
					hashOnion: {
						type: 'object',
						required: ['count', 'distance', 'hashes'],
						properties: {
							count: { type: 'integer' },
							distance: { type: 'integer' },
							hashes: {
								type: 'array',
								items: {
									type: 'string',
									format: 'hex',
								},
							},
						},
					},
				},
			},
		},
	},
};

export const isSeedRevealValidParamsSchema = {
	$id: 'modules/random/api/isSeedReveal/params',
	type: 'object',
	required: ['generatorAddress', 'seedReveal'],
	properties: {
		generatorAddress: {
			type: 'string',
			format: 'hex',
		},
		seedReveal: {
			type: 'string',
			format: 'hex',
		},
	},
};

export const seedRevealSchema = {
	$id: 'modules/random/seedReveal',
	type: 'object',
	properties: {
		validatorReveals: {
			type: 'array',
			fieldNumber: 1,
			items: {
				type: 'object',
				properties: {
					generatorAddress: {
						dataType: 'bytes',
						fieldNumber: 1,
					},
					seedReveal: {
						dataType: 'bytes',
						fieldNumber: 2,
					},
					height: {
						dataType: 'uint32',
						fieldNumber: 3,
					},
					valid: {
						dataType: 'boolean',
						fieldNumber: 4,
					},
				},
				required: ['generatorAddress', 'seedReveal', 'height', 'valid'],
			},
		},
	},
	required: ['validatorReveals'],
};

export const blockHeaderAssetRandomModule = {
	$id: 'modules/random/block/header/asset',
	type: 'object',
	properties: {
		seedReveal: {
			dataType: 'bytes',
			fieldNumber: 1,
		},
	},
	required: ['seedReveal'],
};

export const registeredHashOnionsStoreSchema = {
	title: 'Used hash onion',
	$id: '/node/forger/registered_hash_onion',
	type: 'object',
	required: ['registeredHashOnions'],
	properties: {
		registeredHashOnions: {
			type: 'array',
			fieldNumber: 1,
			items: {
				type: 'object',
				required: ['address', 'seedHash'],
				properties: {
					address: {
						dataType: 'bytes',
						fieldNumber: 1,
					},
					seedHash: {
						dataType: 'bytes',
						fieldNumber: 2,
					},
				},
			},
		},
	},
};

export const usedHashOnionsStoreSchema = {
	title: 'Used hash onion',
	$id: '/node/forger/used_hash_onion',
	type: 'object',
	required: ['usedHashOnions'],
	properties: {
		usedHashOnions: {
			type: 'array',
			fieldNumber: 1,
			items: {
				type: 'object',
				required: ['address', 'count', 'height'],
				properties: {
					address: {
						dataType: 'bytes',
						fieldNumber: 1,
					},
					count: {
						dataType: 'uint32',
						fieldNumber: 2,
					},
					height: {
						dataType: 'uint32',
						fieldNumber: 3,
					},
				},
			},
		},
	},
};
