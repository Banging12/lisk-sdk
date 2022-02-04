const fs = require('fs');
const { getBlockProcessingEnv } = require('./dist-node/testing');
const { transferParamsSchema } = require('./dist-node/modules/token/schemas');
const {
	delegateRegistrationCommandParamsSchema,
	voteCommandParamsSchema,
} = require('./dist-node/modules/dpos_v2/schemas');
const { registerMultisignatureParamsSchema } = require('./dist-node/modules/auth/schemas');
const { signMultiSignatureTransaction } = require('@liskhq/lisk-transactions');
const { codec } = require('@liskhq/lisk-codec');
const { Transaction, TAG_TRANSACTION } = require('@liskhq/lisk-chain');
const {
	getAddressAndPublicKeyFromPassphrase,
	signData,
	generatePrivateKey,
	getPublicKeyFromPrivateKey,
	blsPopProve,
	getKeys,
	getAddressFromPassphrase,
} = require('@liskhq/lisk-cryptography');
const { Mnemonic } = require('@liskhq/lisk-passphrase');

const defaultPassword =
	'tiger grit rigid pipe athlete cheese guitar hurdle remind gap peasant pond';
const genesis = {
	address: Buffer.from('d04699e57c4a3846c988f3c15306796f8eae5c1c', 'hex'),
	publicKey: Buffer.from('0fe9a3f1a21b5530f27f87a414b549e79a940bf24fdf2b2f05e7f22aeeecc86a', 'hex'),
	passphrase: 'peanut hundred pen hawk invite exclude brain chunk gadget wait wrong ready',
	encryptedPassphrase:
		'iterations=10&cipherText=6541c04d7a46eacd666c07fbf030fef32c5db324466e3422e59818317ac5d15cfffb80c5f1e2589eaa6da4f8d611a94cba92eee86722fc0a4015a37cff43a5a699601121fbfec11ea022&iv=141edfe6da3a9917a42004be&salt=f523bba8316c45246c6ffa848b806188&tag=4ffb5c753d4a1dc96364c4a54865521a&version=1',
	password: defaultPassword,
};

const createTransferTransaction = input => {
	const encodedParams = codec.encode(transferParamsSchema, {
		recipientAddress: input.recipientAddress,
		amount: input.amount || BigInt('10000000000'),
		data: '',
	});
	const { publicKey } = getAddressAndPublicKeyFromPassphrase(input.passphrase);

	const tx = new Transaction({
		moduleID: 2,
		commandID: 0,
		nonce: input.nonce,
		senderPublicKey: publicKey,
		fee: input.fee || BigInt('200000'),
		params: encodedParams,
		signatures: [],
	});
	tx.signatures.push(
		signData(TAG_TRANSACTION, input.networkIdentifier, tx.getSigningBytes(), input.passphrase),
	);
	return tx;
};

const createDelegateRegisterTransaction = input => {
	const { publicKey } = getAddressAndPublicKeyFromPassphrase(input.passphrase);
	const blsSK = generatePrivateKey(Buffer.from(input.passphrase, 'utf-8'));
	const blsPK = getPublicKeyFromPrivateKey(blsSK);
	const blsPop = blsPopProve(blsSK);
	const encodedAsset = codec.encode(delegateRegistrationCommandParamsSchema, {
		name: input.username,
		generatorKey: publicKey,
		blsKey: blsPK,
		proofOfPossession: blsPop,
	});

	const tx = new Transaction({
		moduleID: 13,
		commandID: 0,
		nonce: input.nonce,
		senderPublicKey: publicKey,
		fee: input.fee || BigInt('2500000000'),
		params: encodedAsset,
		signatures: [],
	});
	tx.signatures.push(
		signData(TAG_TRANSACTION, input.networkIdentifier, tx.getSigningBytes(), input.passphrase),
	);
	return tx;
};

const createDelegateVoteTransaction = input => {
	const encodedAsset = codec.encode(voteCommandParamsSchema, {
		votes: input.votes,
	});
	const { publicKey } = getAddressAndPublicKeyFromPassphrase(input.passphrase);

	const tx = new Transaction({
		moduleID: 13,
		commandID: 1,
		nonce: input.nonce,
		senderPublicKey: publicKey,
		fee: input.fee || BigInt('100000000'),
		params: encodedAsset,
		signatures: [],
	});
	tx.signatures.push(
		signData(TAG_TRANSACTION, input.networkIdentifier, tx.getSigningBytes(), input.passphrase),
	);
	return tx;
};

const createMultiSignRegisterTransaction = input => {
	const encodedAsset = codec.encode(registerMultisignatureParamsSchema, {
		mandatoryKeys: input.mandatoryKeys,
		optionalKeys: input.optionalKeys,
		numberOfSignatures: input.numberOfSignatures,
	});
	const params = {
		mandatoryKeys: input.mandatoryKeys,
		optionalKeys: input.optionalKeys,
		numberOfSignatures: input.numberOfSignatures,
	};
	const { publicKey } = getAddressAndPublicKeyFromPassphrase(input.senderPassphrase);
	const transaction = [...input.passphrases].reduce(
		(prev, current) => {
			return signMultiSignatureTransaction(
				registerMultisignatureParamsSchema,
				prev,
				input.networkIdentifier,
				current,
				params,
				true,
			);
		},
		{
			moduleID: 12,
			commandID: 0,
			nonce: input.nonce,
			senderPublicKey: publicKey,
			fee: input.fee || BigInt('1100000000'),
			params,
			signatures: [],
		},
	);

	const tx = new Transaction({ ...transaction, params: encodedAsset });
	return tx;
};

const createAccount = () => {
	const passphrase = Mnemonic.generateMnemonic(256);
	const keys = getKeys(passphrase);
	const blsPrivateKey = generatePrivateKey(Buffer.from(passphrase, 'utf-8'));
	const blsPublicKey = getPublicKeyFromPrivateKey(blsPrivateKey);
	const blsPoP = blsPopProve(blsPrivateKey);
	return {
		passphrase,
		address: getAddressFromPassphrase(passphrase),
		publicKey: keys.publicKey,
		privateKey: keys.privateKey,
		blsPrivateKey,
		blsPublicKey,
		blsPoP,
	};
};

const getAccounts = (accounts, offset, count) => {
	const result = [];
	for (let i = offset; i < offset + count; i += 1) {
		result.push(accounts[i % accounts.length]);
	}
	return result;
};

const wait = time => new Promise(resolve => setTimeout(resolve, time));

const size = 500;

(async () => {
	console.log('Creating accounts');
	const accounts = [];
	for (let i = 0; i < size; i += 1) {
		accounts.push(createAccount());
	}
	const env = await getBlockProcessingEnv({
		options: {
			databasePath: './testdb',
		},
	});
	env.accounts.push(...accounts);

	console.log('Creating transactions');
	// create 5000 accounts
	const transfers = [];
	const authData = await env.invoke('auth_getAuthAccount', {
		address: genesis.address.toString('hex'),
	});
	for (let i = 0; i < size; i += 1) {
		transfers.push(
			createTransferTransaction({
				nonce: BigInt(authData.nonce) + BigInt(i),
				recipientAddress: accounts[i].address,
				amount: BigInt('1500000000000'),
				networkIdentifier: env.getNetworkId(),
				passphrase: genesis.passphrase,
			}),
		);
	}
	// wait till CPU settles
	await wait(10000);
	console.log('Executing transfer transaction blocks');
	const maxTransferSize = 100;
	for (i = 0; i < size; i += maxTransferSize) {
		const block = await env.createBlock(transfers.slice(i, i + maxTransferSize));
		await env.process(block);
		console.log('processed', block.transactions.length);
	}
	console.log('Current height', env.getLastBlock().header.height);

	console.log('Creating transactions');
	// register 5000 delegates
	const delegateRegs = [];
	for (let i = 0; i < size; i += 1) {
		delegateRegs.push(
			createDelegateRegisterTransaction({
				nonce: BigInt(0),
				username: `r_${i}`,
				networkIdentifier: env.getNetworkId(),
				passphrase: accounts[i].passphrase,
			}),
		);
	}
	await wait(10000);
	console.log('Executing delegate registrations transaction blocks');
	const maxRegSize = 50;
	for (i = 0; i < size; i += maxRegSize) {
		const block = await env.createBlock(delegateRegs.slice(i, i + maxRegSize));
		await env.process(block);
		console.log('processed', block.transactions.length);
	}
	console.log('Current height', env.getLastBlock().header.height);

	console.log('Creating transactions');
	// votes delegates
	const votes = [];
	for (let i = 0; i < size; i += 1) {
		votes.push(
			createDelegateVoteTransaction({
				nonce: BigInt(1),
				networkIdentifier: env.getNetworkId(),
				passphrase: accounts[i].passphrase,
				votes: getAccounts(accounts, i, 10).map(a => ({
					delegateAddress: a.address,
					amount: BigInt('100000000000'),
				})),
			}),
		);
	}
	await wait(10000);
	console.log('Executing vote transaction blocks');
	const maxVoteSize = 35;
	for (i = 0; i < size; i += maxVoteSize) {
		const block = await env.createBlock(votes.slice(i, i + maxVoteSize));
		await env.process(block);
		console.log('processed', block.transactions.length);
	}
	console.log('Current height', env.getLastBlock().header.height);

	await env.processUntilHeight(500);
	console.log('Current height', env.getLastBlock().header.height);

	console.log('Creating transactions');
	// register 5000 delegates
	const regMultiSig = [];
	for (let i = 0; i < size; i += 1) {
		const party = getAccounts(accounts, i, 64);
		const keys = party.map(a => a.publicKey);
		keys.sort((p1, p2) => p1.compare(p2));
		regMultiSig.push(
			createMultiSignRegisterTransaction({
				nonce: BigInt(2),
				fee: BigInt('110000000'),
				mandatoryKeys: keys,
				optionalKeys: [],
				numberOfSignatures: 64,
				networkIdentifier: env.getNetworkId(),
				senderPassphrase: party[0].passphrase,
				passphrases: [party[0].passphrase, ...party.map(p => p.passphrase)],
			}),
		);
	}
	await wait(10000);
	console.log('Executing multisig registrations transaction blocks');
	const maxMulRegSize = 2;
	for (i = 0; i < size; i += maxMulRegSize) {
		const block = await env.createBlock(regMultiSig.slice(i, i + maxMulRegSize));
		await env.process(block);
		console.log('processed', block.transactions.length);
	}
	console.log('Current height', env.getLastBlock().header.height);
})();
