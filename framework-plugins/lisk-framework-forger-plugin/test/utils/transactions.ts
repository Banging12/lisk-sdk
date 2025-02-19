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
 */
import { Transaction, testing, codec, transactions, cryptography } from 'lisk-sdk';

export const createTransferTransaction = ({
	amount,
	fee,
	recipientAddress,
	nonce,
	networkIdentifier,
}: {
	amount: string;
	fee: string;
	recipientAddress: string;
	nonce: number;
	networkIdentifier: Buffer;
}): Transaction => {
	const genesisAccount = testing.fixtures.defaultFaucetAccount;
	const encodedAsset = codec.encode(new TokenTransferAsset(BigInt(5000000)).schema, {
		recipientAddress: Buffer.from(recipientAddress, 'hex'),
		amount: BigInt(transactions.convertLSKToBeddows(amount)),
		data: '',
	});
	const tx = new Transaction({
		moduleID: 2,
		commandID: 0,
		nonce: BigInt(nonce),
		senderPublicKey: genesisAccount.publicKey,
		fee: BigInt(transactions.convertLSKToBeddows(fee)),
		params: encodedAsset,
		signatures: [],
	});
	tx.signatures.push(
		cryptography.signData(
			transactions.TAG_TRANSACTION,
			networkIdentifier,
			tx.getSigningBytes(),
			genesisAccount.passphrase,
		),
	);
	return tx;
};

export const createVoteTransaction = ({
	amount,
	fee,
	recipientAddress,
	nonce,
	networkIdentifier,
}: {
	amount: string;
	fee: string;
	recipientAddress: string;
	nonce: number;
	networkIdentifier: Buffer;
}): Transaction => {
	const genesisAccount = testing.fixtures.defaultFaucetAccount;
	const encodedAsset = codec.encode(new DPoSVoteAsset().schema, {
		votes: [
			{
				delegateAddress: Buffer.from(recipientAddress, 'hex'),
				amount: BigInt(transactions.convertLSKToBeddows(amount)),
			},
		],
	});

	const tx = new Transaction({
		moduleID: 5,
		commandID: 1,
		nonce: BigInt(nonce),
		senderPublicKey: genesisAccount.publicKey,
		fee: BigInt(transactions.convertLSKToBeddows(fee)),
		params: encodedAsset,
		signatures: [],
	});
	tx.signatures.push(
		cryptography.signData(
			transactions.TAG_TRANSACTION,
			networkIdentifier,
			tx.getSigningBytes(),
			genesisAccount.passphrase,
		),
	);
	return tx;
};
