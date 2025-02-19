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

import { BlockHeader } from '@liskhq/lisk-chain';
import {
	signBLS,
	generatePrivateKey,
	getPublicKeyFromPrivateKey,
	getRandomBytes,
	createAggSig,
} from '@liskhq/lisk-cryptography';
import { codec } from '@liskhq/lisk-codec';
import { Certificate } from '../../../../../src/node/consensus/certificate_generation/types';
import { MESSAGE_TAG_CERTIFICATE } from '../../../../../src/node/consensus/certificate_generation/constants';
import { certificateSchema } from '../../../../../src/node/consensus/certificate_generation/schema';
import {
	verifyAggregateCertificateSignature,
	computeCertificateFromBlockHeader,
	signCertificate,
	verifySingleCertificateSignature,
} from '../../../../../src/node/consensus/certificate_generation/utils';
import { createFakeBlockHeader } from '../../../../../src/testing';

describe('utils', () => {
	const networkIdentifier = Buffer.alloc(0);

	describe('computeCertificateFromBlockHeader', () => {
		let blockHeader: BlockHeader;

		beforeEach(() => {
			blockHeader = createFakeBlockHeader({});
		});

		it('should return a certificate with proper parameters', () => {
			const certificate = computeCertificateFromBlockHeader(blockHeader);

			expect(certificate.blockID).toBe(blockHeader.id);
			expect(certificate.height).toBe(blockHeader.height);
			expect(certificate.stateRoot).toBe(blockHeader.stateRoot);
			expect(certificate.timestamp).toBe(blockHeader.timestamp);
			expect(certificate.validatorsHash).toBe(blockHeader.validatorsHash);
		});

		it('should throw error when stateRoot is undefined', () => {
			(blockHeader as any).stateRoot = undefined;

			expect(() => computeCertificateFromBlockHeader(blockHeader)).toThrow(
				"'stateRoot' is not defined.",
			);
		});

		it('should throw error when validatorsHash is undefined', () => {
			(blockHeader as any).validatorsHash = undefined;

			expect(() => computeCertificateFromBlockHeader(blockHeader)).toThrow(
				"'validatorsHash' is not defined.",
			);
		});
	});

	describe('signCertificate', () => {
		let privateKey: Buffer;
		let certificate: Certificate;
		let signature: Buffer;

		beforeEach(() => {
			privateKey = generatePrivateKey(getRandomBytes(32));
			certificate = {
				blockID: Buffer.alloc(0),
				height: 1000,
				stateRoot: Buffer.alloc(0),
				timestamp: 10000,
				validatorsHash: Buffer.alloc(0),
			};
			const encodedCertificate = codec.encode(certificateSchema, certificate);
			signature = signBLS(
				MESSAGE_TAG_CERTIFICATE,
				networkIdentifier,
				encodedCertificate,
				privateKey,
			);
			(certificate as any).aggregationBits = getRandomBytes(4);
			(certificate as any).signature = getRandomBytes(4);
		});

		it('should sign certificate', () => {
			expect(signCertificate(privateKey, networkIdentifier, certificate)).toEqual(signature);
		});
	});
	describe('verifySingleCertificateSignature', () => {
		let privateKey: Buffer;
		let publicKey: Buffer;
		let certificate: Certificate;
		let signature: Buffer;

		beforeEach(() => {
			privateKey = generatePrivateKey(getRandomBytes(32));
			publicKey = getPublicKeyFromPrivateKey(privateKey);
			certificate = {
				blockID: Buffer.alloc(0),
				height: 1030,
				stateRoot: Buffer.alloc(0),
				timestamp: 10300,
				validatorsHash: Buffer.alloc(0),
			};

			const encodedCertificate = codec.encode(certificateSchema, certificate);

			signature = signBLS(
				MESSAGE_TAG_CERTIFICATE,
				networkIdentifier,
				encodedCertificate,
				privateKey,
			);

			(certificate as any).aggregationBits = getRandomBytes(4);
			(certificate as any).signature = getRandomBytes(4);
		});

		it('should return true with proper parameters', () => {
			const isVerifiedSignature = verifySingleCertificateSignature(
				publicKey,
				signature,
				networkIdentifier,
				certificate,
			);

			expect(isVerifiedSignature).toBeTrue();
		});

		it('should return false for wrong public key', () => {
			publicKey = getRandomBytes(48);

			const isVerifiedSignature = verifySingleCertificateSignature(
				publicKey,
				signature,
				networkIdentifier,
				certificate,
			);

			expect(isVerifiedSignature).toBeFalse();
		});

		it('should return false for wrong signature', () => {
			signature = getRandomBytes(32);

			const isVerifiedSignature = verifySingleCertificateSignature(
				publicKey,
				signature,
				networkIdentifier,
				certificate,
			);

			expect(isVerifiedSignature).toBeFalse();
		});
	});
	describe('verifyAggregateCertificateSignature', () => {
		let certificate: Certificate;
		let keysList: Buffer[];
		let privateKeys: Buffer[];
		let publicKeys: Buffer[];
		let weights: number[];
		let threshold: number;
		let signatures: Buffer[];
		let pubKeySignaturePairs: { publicKey: Buffer; signature: Buffer }[];
		let aggregateSignature: Buffer;
		let aggregationBits: Buffer;

		beforeEach(() => {
			privateKeys = Array.from({ length: 103 }, _ => generatePrivateKey(getRandomBytes(32)));
			publicKeys = privateKeys.map(priv => getPublicKeyFromPrivateKey(priv));

			keysList = [...publicKeys];
			weights = Array.from({ length: 103 }, _ => 1);
			threshold = 33;

			certificate = {
				blockID: Buffer.alloc(0),
				height: 1030,
				stateRoot: Buffer.alloc(0),
				timestamp: 10300,
				validatorsHash: Buffer.alloc(0),
			};

			const encodedCertificate = codec.encode(certificateSchema, certificate);

			signatures = privateKeys.map(privateKey =>
				signBLS(MESSAGE_TAG_CERTIFICATE, networkIdentifier, encodedCertificate, privateKey),
			);

			pubKeySignaturePairs = Array.from({ length: 103 }, (_, i) => ({
				publicKey: publicKeys[i],
				signature: signatures[i],
			}));

			({ aggregationBits, signature: aggregateSignature } = createAggSig(
				publicKeys,
				pubKeySignaturePairs,
			));

			(certificate as any).aggregationBits = aggregationBits;
			(certificate as any).signature = aggregateSignature;
		});

		it('should return true for proper parameters', () => {
			const isVerifiedSignature = verifyAggregateCertificateSignature(
				keysList,
				weights,
				threshold,
				networkIdentifier,
				certificate,
			);

			expect(isVerifiedSignature).toBeTrue();
		});

		it('should return false for one unmatching publicKey in keysList', () => {
			keysList[102] = getRandomBytes(32);

			const isVerifiedSignature = verifyAggregateCertificateSignature(
				keysList,
				weights,
				threshold,
				networkIdentifier,
				certificate,
			);

			expect(isVerifiedSignature).toBeFalse();
		});

		it('should return false for below threshold certificate value', () => {
			threshold = 105;

			const isVerifiedSignature = verifyAggregateCertificateSignature(
				keysList,
				weights,
				threshold,
				networkIdentifier,
				certificate,
			);

			expect(isVerifiedSignature).toBeFalse();
		});

		it('should return false for missing aggregationBits', () => {
			delete (certificate as any).aggregationBits;

			const isVerifiedSignature = verifyAggregateCertificateSignature(
				keysList,
				weights,
				threshold,
				networkIdentifier,
				certificate,
			);

			expect(isVerifiedSignature).toBeFalse();
		});

		it('should return false for missing signature', () => {
			delete (certificate as any).signature;

			const isVerifiedSignature = verifyAggregateCertificateSignature(
				keysList,
				weights,
				threshold,
				networkIdentifier,
				certificate,
			);

			expect(isVerifiedSignature).toBeFalse();
		});

		it('should return false for wrong aggregationBits', () => {
			(certificate as any).aggregationBits = getRandomBytes(32);

			const isVerifiedSignature = verifyAggregateCertificateSignature(
				keysList,
				weights,
				threshold,
				networkIdentifier,
				certificate,
			);

			expect(isVerifiedSignature).toBeFalse();
		});

		it('should return false for wrong signature', () => {
			(certificate as any).signature = getRandomBytes(32);

			const isVerifiedSignature = verifyAggregateCertificateSignature(
				keysList,
				weights,
				threshold,
				networkIdentifier,
				certificate,
			);

			expect(isVerifiedSignature).toBeFalse();
		});
	});
});
