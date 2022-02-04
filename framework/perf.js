const { regularMerkleTree } = require('@liskhq/lisk-tree');
const {
	getRandomBytes,
	hash,
	getKeys,
	signData,
	verifyData,
	generatePrivateKey,
	signBLS,
	verifyBLS,
	getPublicKeyFromPrivateKey,
	createAggSig,
	verifyWeightedAggSig,
} = require('@liskhq/lisk-cryptography');
const { Mnemonic } = require('@liskhq/lisk-passphrase');
const { Transaction } = require('@liskhq/lisk-chain');
const { codec } = require('@liskhq/lisk-codec');
const { validator } = require('@liskhq/lisk-validator');

const fullBlockSchema = {
	$id: '/block',
	type: 'object',
	properties: {
		header: {
			fieldNumber: 1,
			type: 'object',
			properties: {
				version: { dataType: 'uint32', fieldNumber: 1 },
				timestamp: { dataType: 'uint32', fieldNumber: 2 },
				height: { dataType: 'uint32', fieldNumber: 3 },
				previousBlockID: { dataType: 'bytes', fieldNumber: 4 },
				generatorAddress: { dataType: 'bytes', fieldNumber: 5 },
				transactionRoot: { dataType: 'bytes', fieldNumber: 6 },
				assetsRoot: { dataType: 'bytes', fieldNumber: 7 },
				stateRoot: { dataType: 'bytes', fieldNumber: 8 },
				maxHeightPrevoted: { dataType: 'uint32', fieldNumber: 9 },
				maxHeightGenerated: { dataType: 'uint32', fieldNumber: 10 },
				validatorsHash: { dataType: 'bytes', fieldNumber: 11 },
				aggregateCommit: {
					type: 'object',
					fieldNumber: 12,
					required: ['height', 'aggregationBits', 'certificateSignature'],
					properties: {
						height: {
							dataType: 'uint32',
							fieldNumber: 1,
						},
						aggregationBits: {
							dataType: 'bytes',
							fieldNumber: 2,
						},
						certificateSignature: {
							dataType: 'bytes',
							fieldNumber: 3,
						},
					},
				},
				signature: { dataType: 'bytes', fieldNumber: 13 },
			},
		},
		transactions: {
			type: 'array',
			fieldNumber: 2,
			items: {
				type: 'object',
				required: ['moduleID', 'commandID', 'nonce', 'fee', 'senderPublicKey', 'params'],
				properties: {
					moduleID: {
						dataType: 'uint32',
						fieldNumber: 1,
						minimum: 2,
					},
					commandID: {
						dataType: 'uint32',
						fieldNumber: 2,
					},
					nonce: {
						dataType: 'uint64',
						fieldNumber: 3,
					},
					fee: {
						dataType: 'uint64',
						fieldNumber: 4,
					},
					senderPublicKey: {
						dataType: 'bytes',
						fieldNumber: 5,
						minLength: 32,
						maxLength: 32,
					},
					params: {
						fieldNumber: 6,
						type: 'object',
						properties: {
							votes: {
								type: 'array',
								fieldNumber: 1,
								minItems: 1,
								maxItems: 20,
								items: {
									type: 'object',
									required: ['delegateAddress', 'amount'],
									properties: {
										delegateAddress: {
											dataType: 'bytes',
											fieldNumber: 1,
											minLength: 20,
											maxLength: 20,
										},
										amount: {
											dataType: 'sint64',
											fieldNumber: 2,
										},
									},
								},
							},
						},
					},
					signatures: {
						type: 'array',
						items: {
							dataType: 'bytes',
						},
						fieldNumber: 7,
					},
				},
			},
		},
		assets: {
			type: 'array',
			items: {
				type: 'object',
				required: ['moduleID', 'data'],
				properties: {
					moduleID: {
						dataType: 'uint32',
						fieldNumber: 1,
					},
					data: {
						fieldNumber: 2,
						type: 'object',
						properties: {
							seedReveal: {
								dataType: 'bytes',
								fieldNumber: 1,
							},
						},
					},
				},
			},
			fieldNumber: 3,
		},
	},
	required: ['header', 'transactions', 'assets'],
};

const maxUInt32 = 2 ** 32 + 1;
const getRandomInt = () => Math.floor(Math.random() * maxUInt32);

const createTx = () => {
	const params = { votes: [] };
	for (let i = 0; i < 20; i += 1) {
		params.votes.push({
			delegateAddress: getRandomBytes(20),
			amount: BigInt(getRandomInt()),
		});
	}
	const tx = {
		moduleID: 2,
		commandID: 0,
		nonce: BigInt(getRandomInt()),
		senderPublicKey: getRandomBytes(32),
		fee: BigInt(getRandomInt()),
		params: params,
		signatures: new Array(64).fill(0).map(() => getRandomBytes(64)),
	};
	return tx;
};

const createFullBlock = () => {
	const header = {
		version: 3,
		timestamp: getRandomInt(),
		height: getRandomInt(),
		previousBlockID: hash(getRandomBytes(4)),
		transactionRoot: hash(getRandomBytes(4)),
		maxHeightGenerated: getRandomInt(),
		maxHeightPrevoted: getRandomInt(),
		assetsRoot: hash(getRandomBytes(4)),
		aggregateCommit: {
			height: getRandomInt(),
			aggregationBits: getRandomBytes(4),
			certificateSignature: getRandomBytes(64),
		},
		validatorsHash: hash(getRandomBytes(4)),
		stateRoot: hash(getRandomBytes(4)),
		generatorAddress: getRandomBytes(32),
		signature: getRandomBytes(64),
	};
	const assets = [
		{
			moduleID: 3,
			data: {
				seedReveal: getRandomBytes(16),
			},
		},
	];
	const transactions = new Array(150).fill(0).map(() => createTx());

	return {
		header,
		assets,
		transactions,
	};
};

(async () => {
	// measure hash
	{
		const data = [];
		for (let i = 0; i < 10000; i += 1) {
			data.push(getRandomBytes(1500));
		}
		console.time('hash');
		for (const d of data) {
			hash(d);
		}
		console.timeEnd('hash');
	}
	// encode block
	{
		const data = [];
		for (let i = 0; i < 100; i += 1) {
			data.push(createFullBlock());
		}
		console.time('encode-block');
		for (const d of data) {
			codec.encode(fullBlockSchema, d);
		}
		console.timeEnd('encode-block');
	}
	// encodeJSON block
	{
		const data = [];
		for (let i = 0; i < 100; i += 1) {
			data.push(createFullBlock());
		}
		console.time('encodeJSON-block');
		for (const d of data) {
			codec.encodeJSON(fullBlockSchema, d);
		}
		console.timeEnd('encodeJSON-block');
	}
	// decode block
	{
		const data = [];
		for (let i = 0; i < 100; i += 1) {
			data.push(codec.encode(fullBlockSchema, createFullBlock()));
		}
		console.time('decode-block');
		for (const d of data) {
			codec.decode(fullBlockSchema, d);
		}
		console.timeEnd('decode-block');
	}
	// decodeJSON block
	{
		const data = [];
		for (let i = 0; i < 100; i += 1) {
			data.push(codec.encode(fullBlockSchema, createFullBlock()));
		}
		console.time('decodeJSON-block');
		for (const d of data) {
			codec.decodeJSON(fullBlockSchema, d);
		}
		console.timeEnd('decodeJSON-block');
	}
	// validation
	{
		const data = [];
		for (let i = 0; i < 100; i += 1) {
			data.push(getRandomBytes(750).toString('hex'));
		}
		console.time('validate-randomstr');
		for (const d of data) {
			validator.validate(fullBlockSchema, d);
		}
		console.timeEnd('validate-randomstr');
	}
	// validate block
	{
		const data = [];
		for (let i = 0; i < 100; i += 1) {
			data.push(createFullBlock());
		}
		console.time('validate-block');
		for (const d of data) {
			validator.validate(fullBlockSchema, d);
		}
		console.timeEnd('validate-block');
	}
	// verify signature
	{
		const data = [];
		for (let i = 0; i < 4096; i += 1) {
			const signing = getRandomBytes(1024 * 15);
			const passphrase = Mnemonic.generateMnemonic(256);
			const keys = getKeys(passphrase);
			const networkID = getRandomBytes(32);
			const signature = signData('BLOCK_', networkID, signing, passphrase);
			data.push({
				...keys,
				networkID,
				signing,
				signature,
			});
		}
		console.time('verify-signature');
		for (const d of data) {
			verifyData('BLOCK_', d.networkID, d.signing, d.signature, d.publicKey);
		}
		console.timeEnd('verify-signature');
	}
	// signBLS
	{
		const data = [];
		const networkID = getRandomBytes(32);
		for (let i = 0; i < 100; i += 1) {
			const signing = getRandomBytes(1024);
			const passphrase = Mnemonic.generateMnemonic(256);
			const sk = generatePrivateKey(Buffer.from(passphrase, 'utf-8'));
			data.push({
				sk,
				passphrase,
				networkID,
				signing,
			});
		}
		console.time('signBLS');
		for (const d of data) {
			signBLS('LSK_CE_', d.networkID, d.signing, d.sk);
		}
		console.timeEnd('signBLS');
	}
	// verifyBLS
	{
		const data = [];
		const networkID = getRandomBytes(32);
		for (let i = 0; i < 100; i += 1) {
			const signing = getRandomBytes(1024);
			const passphrase = Mnemonic.generateMnemonic(256);
			const sk = generatePrivateKey(Buffer.from(passphrase, 'utf-8'));
			const pk = getPublicKeyFromPrivateKey(sk);
			const signature = signBLS('LSK_CE_', networkID, signing, sk);
			data.push({
				sk,
				pk,
				passphrase,
				networkID,
				signing,
				signature,
			});
		}
		console.time('verifyBLS');
		for (const d of data) {
			verifyBLS('LSK_CE_', d.networkID, d.signing, d.signature, d.pk);
		}
		console.timeEnd('verifyBLS');
	}
	// verifyBLS
	{
		const data = [];
		const networkID = getRandomBytes(32);
		const signing = getRandomBytes(1024);
		for (let i = 0; i < 103; i += 1) {
			const passphrase = Mnemonic.generateMnemonic(256);
			const sk = generatePrivateKey(Buffer.from(passphrase, 'utf-8'));
			const pk = getPublicKeyFromPrivateKey(sk);
			const signature = signBLS('LSK_CE_', networkID, signing, sk);
			data.push({
				sk,
				pk,
				passphrase,
				networkID,
				signing,
				signature,
			});
		}
		console.time('createAggSig');
		for (let i = 0; i < 100; i += 1) {
			createAggSig(
				data.map(d => d.pk),
				data.map(d => ({ publicKey: d.pk, signature: d.signature })),
			);
		}
		console.timeEnd('createAggSig');
	}
	// verifyWeightedAggSig
	{
		const data = [];
		const signing = getRandomBytes(1024);
		const networkID = getRandomBytes(32);
		for (let i = 0; i < 103; i += 1) {
			const passphrase = Mnemonic.generateMnemonic(256);
			const sk = generatePrivateKey(Buffer.from(passphrase, 'utf-8'));
			const pk = getPublicKeyFromPrivateKey(sk);
			const signature = signBLS('LSK_CE_', networkID, signing, sk);
			data.push({
				sk,
				pk,
				passphrase,
				networkID,
				signing,
				signature,
			});
		}
		const aggSignature = createAggSig(
			data.map(d => d.pk),
			data.map(d => ({ publicKey: d.pk, signature: d.signature })),
		);
		console.time('verifyWeightedAggSig');
		for (let i = 0; i < 100; i += 1) {
			verifyWeightedAggSig(
				data.map(d => d.pk),
				aggSignature.aggregationBits,
				aggSignature.signature,
				'LSK_CE_',
				networkID,
				signing,
				data.map(() => 1n),
				68n,
			);
		}
		console.timeEnd('verifyWeightedAggSig');
	}
	// calculateMerkleRootWithLeaves - id
	{
		const data = [];
		for (let i = 0; i < 200; i += 1) {
			const key = getRandomBytes(32);
			data.push(key);
		}
		console.time('calculateMerkleRootWithLeaves-id');
		for (let i = 0; i < 100; i += 1) {
			regularMerkleTree.calculateMerkleRootWithLeaves(data);
		}
		console.timeEnd('calculateMerkleRootWithLeaves-id');
	}
	// calculateMerkleRootWithLeaves
	{
		const data = [];
		for (let i = 0; i < 500; i += 1) {
			const key = getRandomBytes(300);
			data.push(key);
		}
		console.time('calculateMerkleRootWithLeaves-event');
		for (let i = 0; i < 100; i += 1) {
			regularMerkleTree.calculateMerkleRootWithLeaves(data);
		}
		console.timeEnd('calculateMerkleRootWithLeaves-event');
	}
	// calculateMerkleRoot
	{
		console.time('calculateMerkleRoot');
		let result = { appendPath: [], size: 0, root: undefined };
		for (let i = 0; i < 10000; i += 1) {
			result = regularMerkleTree.calculateMerkleRoot({
				value: getRandomBytes(32),
				appendPath: result.appendPath,
				size: result.size,
			});
		}
		console.timeEnd('calculateMerkleRoot');
		console.time('calculateMerkleRoot');
		for (let i = 0; i < 10000; i += 1) {
			result = regularMerkleTree.calculateMerkleRoot({
				value: getRandomBytes(32),
				appendPath: result.appendPath,
				size: result.size,
			});
		}
		console.timeEnd('calculateMerkleRoot');
	}
	// calculateRootFromRightWitness
	{
		const inputs = new Array(10000).fill(0).map(() => getRandomBytes(32));
		const mt = new regularMerkleTree.MerkleTree();
		await mt.init(inputs);
		const partial = new regularMerkleTree.MerkleTree();
		const split = 9889;
		await partial.init(inputs.slice(0, split));
		const appendPath = await partial['_getAppendPathHashes']();
		const witness = await mt.generateRightWitness(split);
		console.time('calculateRootFromRightWitness');
		for (let i = 0; i < 100; i += 1) {
			regularMerkleTree.calculateRootFromRightWitness(split, appendPath, witness);
		}
		console.timeEnd('calculateRootFromRightWitness');
	}
	// verifyRightWitness
	{
		const inputs = new Array(10000).fill(0).map(() => getRandomBytes(32));
		const mt = new regularMerkleTree.MerkleTree();
		await mt.init(inputs);
		const partial = new regularMerkleTree.MerkleTree();
		const split = 9889;
		await partial.init(inputs.slice(0, split));
		const appendPath = await partial['_getAppendPathHashes']();
		const witness = await mt.generateRightWitness(split);
		console.time('verifyRightWitness');
		for (let i = 0; i < 100; i += 1) {
			regularMerkleTree.verifyRightWitness(split, appendPath, witness, mt.root);
		}
		console.timeEnd('verifyRightWitness');
	}
})();
