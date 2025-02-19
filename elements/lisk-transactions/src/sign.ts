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

import { codec, Schema } from '@liskhq/lisk-codec';
import {
	getAddressAndPublicKeyFromPassphrase,
	signData,
	signDataWithPrivateKey,
	hash,
	getPublicKey,
} from '@liskhq/lisk-cryptography';
import { validateTransaction } from './validate';
import { baseTransactionSchema } from './schema';
import { TAG_TRANSACTION } from './constants';

interface MultiSignatureKeys {
	readonly mandatoryKeys: Array<Buffer>;
	readonly optionalKeys: Array<Buffer>;
}

// Validates transaction against schema and returns transaction bytes for signing
export const getSigningBytes = (
	paramsSchema: object,
	transactionObject: Record<string, unknown>,
): Buffer => {
	const validationErrors = validateTransaction(paramsSchema, transactionObject);
	if (validationErrors) {
		throw validationErrors;
	}
	if (typeof transactionObject.params !== 'object' || transactionObject.params === null) {
		throw new Error('Parameters must be of type object and not null');
	}
	const paramsBytes = codec.encode((paramsSchema as unknown) as Schema, transactionObject.params);
	const transactionBytes = codec.encode(baseTransactionSchema, {
		...transactionObject,
		params: paramsBytes,
		signatures: [],
	});

	return transactionBytes;
};

export const getBytes = (
	paramsSchema: object,
	transactionObject: Record<string, unknown>,
): Buffer => {
	if (typeof transactionObject.params !== 'object' || transactionObject.params === null) {
		throw new Error('Parameters must be of type object and not null');
	}
	const paramsBytes = codec.encode((paramsSchema as unknown) as Schema, transactionObject.params);
	const transactionBytes = codec.encode(baseTransactionSchema, {
		...transactionObject,
		params: paramsBytes,
	});

	return transactionBytes;
};

// Validates transaction against schema and returns transaction including signature
export const signTransaction = (
	paramsSchema: object,
	transactionObject: Record<string, unknown>,
	networkIdentifier: Buffer,
	passphrase: string,
): Record<string, unknown> => {
	if (!networkIdentifier.length) {
		throw new Error('Network identifier is required to sign a transaction');
	}

	if (!passphrase) {
		throw new Error('Passphrase is required to sign a transaction');
	}
	const validationErrors = validateTransaction(paramsSchema, transactionObject);
	if (validationErrors) {
		throw validationErrors;
	}
	const { publicKey } = getAddressAndPublicKeyFromPassphrase(passphrase);

	if (
		!Buffer.isBuffer(transactionObject.senderPublicKey) ||
		!transactionObject.senderPublicKey.equals(publicKey)
	) {
		throw new Error('Transaction senderPublicKey does not match public key from passphrase');
	}

	const signature = signData(
		TAG_TRANSACTION,
		networkIdentifier,
		getSigningBytes(paramsSchema, transactionObject),
		passphrase,
	);
	// eslint-disable-next-line no-param-reassign
	transactionObject.signatures = [signature];
	return { ...transactionObject, id: hash(getBytes(paramsSchema, transactionObject)) };
};

const sanitizeSignaturesArray = (
	transactionObject: Record<string, unknown>,
	keys: MultiSignatureKeys,
	includeSenderSignature: boolean,
): void => {
	const numberOfSignatures =
		(includeSenderSignature ? 1 : 0) + keys.mandatoryKeys.length + keys.optionalKeys.length;

	for (let i = 0; i < numberOfSignatures; i += 1) {
		if (
			Array.isArray(transactionObject.signatures) &&
			transactionObject.signatures[i] === undefined
		) {
			// eslint-disable-next-line no-param-reassign
			transactionObject.signatures[i] = Buffer.alloc(0);
		}
	}
};

// Validates transaction against schema and sign a multi-signature transaction
export const signMultiSignatureTransaction = (
	paramsSchema: object,
	transactionObject: Record<string, unknown>,
	networkIdentifier: Buffer,
	passphrase: string,
	keys: MultiSignatureKeys,
	includeSenderSignature = false,
): Record<string, unknown> => {
	if (!networkIdentifier.length) {
		throw new Error('Network identifier is required to sign a transaction');
	}

	if (!passphrase) {
		throw new Error('Passphrase is required to sign a transaction');
	}

	if (!Array.isArray(transactionObject.signatures)) {
		throw new Error('Signatures must be of type array');
	}

	const validationErrors = validateTransaction(paramsSchema, transactionObject);
	if (validationErrors) {
		throw validationErrors;
	}
	// Sort keys
	keys.mandatoryKeys.sort((publicKeyA, publicKeyB) => publicKeyA.compare(publicKeyB));
	keys.optionalKeys.sort((publicKeyA, publicKeyB) => publicKeyA.compare(publicKeyB));

	const { publicKey } = getAddressAndPublicKeyFromPassphrase(passphrase);
	const signature = signData(
		TAG_TRANSACTION,
		networkIdentifier,
		getSigningBytes(paramsSchema, transactionObject),
		passphrase,
	);

	if (
		includeSenderSignature &&
		Buffer.isBuffer(transactionObject.senderPublicKey) &&
		publicKey.equals(transactionObject.senderPublicKey)
	) {
		// eslint-disable-next-line no-param-reassign
		transactionObject.signatures[0] = signature;
	}

	// Locate where this public key should go in the signatures array
	const mandatoryKeyIndex = keys.mandatoryKeys.findIndex(aPublicKey =>
		aPublicKey.equals(publicKey),
	);
	const optionalKeyIndex = keys.optionalKeys.findIndex(aPublicKey => aPublicKey.equals(publicKey));

	// If it's a mandatory Public Key find where to add the signature
	if (mandatoryKeyIndex !== -1) {
		const signatureOffset = includeSenderSignature ? 1 : 0;
		// eslint-disable-next-line no-param-reassign
		transactionObject.signatures[mandatoryKeyIndex + signatureOffset] = signature;
	}

	if (optionalKeyIndex !== -1) {
		const signatureOffset = includeSenderSignature ? 1 : 0;
		// eslint-disable-next-line no-param-reassign
		transactionObject.signatures[
			keys.mandatoryKeys.length + optionalKeyIndex + signatureOffset
		] = signature;
	}

	sanitizeSignaturesArray(transactionObject, keys, includeSenderSignature);

	return { ...transactionObject, id: hash(getBytes(paramsSchema, transactionObject)) };
};

export const signTransactionWithPrivateKey = (
	paramsSchema: object,
	transactionObject: Record<string, unknown>,
	networkIdentifier: Buffer,
	privateKey: Buffer,
): Record<string, unknown> => {
	if (!networkIdentifier.length) {
		throw new Error('Network identifier is required to sign a transaction');
	}

	if (!privateKey.length || privateKey.length !== 64) {
		throw new Error('Private key must be 64 bytes');
	}

	const validationErrors = validateTransaction(paramsSchema, transactionObject);
	if (validationErrors) {
		throw validationErrors;
	}

	const transactionWithNetworkIdentifierBytes = Buffer.concat([
		networkIdentifier,
		getSigningBytes(paramsSchema, transactionObject),
	]);

	const signature = signDataWithPrivateKey(
		TAG_TRANSACTION,
		networkIdentifier,
		transactionWithNetworkIdentifierBytes,
		privateKey,
	);

	// eslint-disable-next-line no-param-reassign
	transactionObject.signatures = [signature];
	return { ...transactionObject, id: hash(getBytes(paramsSchema, transactionObject)) };
};

export const signMultiSignatureTransactionWithPrivateKey = (
	paramsSchema: object,
	transactionObject: Record<string, unknown>,
	networkIdentifier: Buffer,
	privateKey: Buffer,
	keys: MultiSignatureKeys,
	includeSenderSignature = false,
): Record<string, unknown> => {
	if (!networkIdentifier.length) {
		throw new Error('Network identifier is required to sign a transaction');
	}

	if (!privateKey.length || privateKey.length !== 64) {
		throw new Error('Private key must be 64 bytes');
	}

	if (!Array.isArray(transactionObject.signatures)) {
		throw new Error('Signatures must be of type array');
	}

	const validationErrors = validateTransaction(paramsSchema, transactionObject);
	if (validationErrors) {
		throw validationErrors;
	}

	// Sort keys
	keys.mandatoryKeys.sort((publicKeyA, publicKeyB) => publicKeyA.compare(publicKeyB));
	keys.optionalKeys.sort((publicKeyA, publicKeyB) => publicKeyA.compare(publicKeyB));

	const transactionWithNetworkIdentifierBytes = Buffer.concat([
		networkIdentifier,
		getSigningBytes(paramsSchema, transactionObject),
	]);

	const signature = signDataWithPrivateKey(
		TAG_TRANSACTION,
		networkIdentifier,
		transactionWithNetworkIdentifierBytes,
		privateKey,
	);

	const signerPublicKey = getPublicKey(privateKey);

	if (
		includeSenderSignature &&
		Buffer.isBuffer(transactionObject.senderPublicKey) &&
		signerPublicKey.equals(transactionObject.senderPublicKey)
	) {
		// eslint-disable-next-line no-param-reassign
		transactionObject.signatures[0] = signature;
	}

	// Locate where this public key should go in the signatures array
	const mandatoryKeyIndex = keys.mandatoryKeys.findIndex(aPublicKey =>
		aPublicKey.equals(signerPublicKey),
	);
	const optionalKeyIndex = keys.optionalKeys.findIndex(aPublicKey =>
		aPublicKey.equals(signerPublicKey),
	);

	// If it's a mandatory Public Key find where to add the signature
	if (mandatoryKeyIndex !== -1) {
		const signatureOffset = includeSenderSignature ? 1 : 0;
		// eslint-disable-next-line no-param-reassign
		transactionObject.signatures[mandatoryKeyIndex + signatureOffset] = signature;
	}

	if (optionalKeyIndex !== -1) {
		const signatureOffset = includeSenderSignature ? 1 : 0;
		// eslint-disable-next-line no-param-reassign
		transactionObject.signatures[
			keys.mandatoryKeys.length + optionalKeyIndex + signatureOffset
		] = signature;
	}

	sanitizeSignaturesArray(transactionObject, keys, includeSenderSignature);

	return { ...transactionObject, id: hash(getBytes(paramsSchema, transactionObject)) };
};
