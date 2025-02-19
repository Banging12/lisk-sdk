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
import * as fs from 'fs';
import * as path from 'path';
import { debug } from 'debug';
import levelup, { LevelUp } from 'levelup';
import { NotFoundError } from './errors';
import { Options, BatchChain, ReadStreamOptions } from './types';

// rocksdb removed the default export. However, @types/rocksdb still only exposes default.
// Therefore, temporally requiree with below syntax.
// eslint-disable-next-line import/order
import rocksDB = require('rocksdb');

const logger = debug('db');

export class KVStore {
	private readonly _db: LevelUp<unknown>;

	public constructor(filePath: string) {
		logger('opening file', { filePath });
		const parentDir = path.resolve(path.join(filePath, '../'));
		if (!fs.existsSync(parentDir)) {
			throw new Error(`${parentDir} does not exist`);
		}
		// eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-explicit-any
		this._db = levelup((rocksDB as any)(filePath));
	}

	public async close(): Promise<void> {
		await this._db.close();
	}

	public async get(key: Buffer): Promise<Buffer> {
		logger('get', { key });
		try {
			const result = (await this._db.get(key)) as Buffer;
			return result;
		} catch (error) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			if (error.notFound) {
				throw new NotFoundError(key.toString('hex'));
			}
			throw error;
		}
	}

	public async exists(key: Buffer): Promise<boolean> {
		try {
			logger('exists', { key });
			await this._db.get(key);

			return true;
		} catch (error) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			if (error.notFound) {
				return false;
			}
			throw error;
		}
	}

	public async clear(options?: Options): Promise<void> {
		await this._db.clear(options);
	}

	public async put(key: Buffer, val: Buffer): Promise<void> {
		logger('put', { key });

		await this._db.put(key, val);
	}

	public async del(key: Buffer): Promise<void> {
		logger('del', { key });

		await this._db.del(key);
	}

	public createReadStream(options?: ReadStreamOptions): NodeJS.ReadableStream {
		logger('readStream', { options });
		return this._db.createReadStream({ ...options, keyAsBuffer: true });
	}

	public batch(): BatchChain {
		return this._db.batch();
	}
}
