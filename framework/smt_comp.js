const {
	sparseMerkleTree: { SparseMerkleTree },
	SkipMerkleTree,
	FastSkipMerkleTree,
} = require('@liskhq/lisk-tree');
const { KVStore, InMemoryKVStore } = require('@liskhq/lisk-db');
const { getRandomBytes, hash } = require('@liskhq/lisk-cryptography');
const { SMTStore } = require('@liskhq/lisk-chain');

const { performance } = require('perf_hooks');
const chalk = require('chalk');

const db = new KVStore('./state.db');
const kdb = new KVStore('./kstate.db');
const fkdb = new KVStore('./fkstate.db');

const KEY_LENGTH = 20;

// const db = new InMemoryKVStore();
let kvdata = [];
let smtRoot;
let skmtRoot;
let fskmtRoot;

const measure = async (iteration, keep) => {
	const next = [];
	const keys = [];
	const values = [];
	for (let i = 0; i < iteration; i += 1) {
		if (keep) {
			const nextKey = kvdata[i] ? kvdata[i].key : getRandomBytes(KEY_LENGTH);
			next.push({
				key: nextKey,
				value: hash(getRandomBytes(KEY_LENGTH)),
			});
			keys.push(nextKey);
			values.push(hash(getRandomBytes(KEY_LENGTH)));
		} else {
			next.push({
				key: getRandomBytes(KEY_LENGTH),
				value: hash(getRandomBytes(KEY_LENGTH)),
			});
			keys.push(getRandomBytes(KEY_LENGTH));
			values.push(hash(getRandomBytes(KEY_LENGTH)));
		}
	}
	kvdata = next;

	const smtStore = new SMTStore(db);
	const smt = new SparseMerkleTree({ db: smtStore, rootHash: smtRoot, keyLength: KEY_LENGTH });
	const start = performance.now();
	console.time('smt-batch');
	console.time('smt-update-batch');
	await smt.update([...keys], [...values]);
	console.timeEnd('smt-update-batch');
	console.time('smt-save-batch');
	const batch = db.batch();
	smtStore.finalize(batch);
	await batch.write();
	smtRoot = smt.rootHash;
	console.timeEnd('smt-save-batch');
	console.timeEnd('smt-batch');
	const smtTime = performance.now() - start;

	const skmtStore = new SMTStore(kdb);
	const skmt = new SkipMerkleTree({ db: skmtStore, rootHash: skmtRoot, keyLength: KEY_LENGTH });
	const kstart = performance.now();
	console.time('skmt-batch');
	console.time('skmt-update-batch');
	await skmt.update([...keys], [...values]);
	console.timeEnd('skmt-update-batch');
	console.time('skmt-save-batch');
	const kbatch = kdb.batch();
	skmtStore.finalize(kbatch);
	await kbatch.write();
	skmtRoot = skmt.rootHash;
	console.timeEnd('skmt-save-batch');
	console.timeEnd('skmt-batch');
	const skmtTime = performance.now() - kstart;

	const fskmtStore = new SMTStore(fkdb);
	const fskmt = new FastSkipMerkleTree({ db: fskmtStore, rootHash: fskmtRoot, keyLength: KEY_LENGTH });
	const fkstart = performance.now();
	console.time('fskmt-batch');
	console.time('fskmt-update-batch');
	await fskmt.update([...keys], [...values]);
	console.timeEnd('fskmt-update-batch');
	console.time('fskmt-save-batch');
	const fkbatch = fkdb.batch();
	skmtStore.finalize(fkbatch);
	await fkbatch.write();
	fskmtRoot = fskmt.rootHash;
	console.timeEnd('fskmt-save-batch');
	console.timeEnd('fskmt-batch');
	const fskmtTime = performance.now() - fkstart;

	if (!smt.rootHash.equals(skmt.rootHash) || !smt.rootHash.equals(fskmt.rootHash)) {
		console.log(smt.rootHash.toString('Hex'), fskmt.rootHash.toString('Hex'));
		throw new Error('Mismatching roots.');
	}

	if (smtTime > skmtTime)
		console.log(
			chalk.green(
				`SMT ${smtTime.toFixed(2)} ms; SKMT ${skmtTime.toFixed(2)} ms -> ${(
					(100 * skmtTime) /
					smtTime
				).toFixed(2)}%`,
			),
		);
	else
		console.log(
			chalk.red(
				`SMT ${smtTime.toFixed(2)} ms; SKMT ${skmtTime.toFixed(2)} ms -> ${(
					(100 * skmtTime) /
					smtTime
				).toFixed(2)}%`,
			),
		);
	if (skmtTime > fskmtTime)
		console.log(
			chalk.blue(
				`SKMT ${skmtTime.toFixed(2)} ms; FSKMT ${fskmtTime.toFixed(2)} ms -> ${(
					(100 * fskmtTime) /
					smtTime
				).toFixed(2)}%`,
			),
		);
	else
		console.log(
			chalk.red(
				`SKMT ${skmtTime.toFixed(2)} ms; FSKMT ${fskmtTime.toFixed(2)} ms -> ${(
					(100 * fskmtTime) /
					smtTime
				).toFixed(2)}%`,
			),
		);
};

(async () => {
	let total = 0;
	for (let i = 0; i < 1000; i++) {
		console.log('iteration batch update', 10000);
		await measure(10000);
		total += 10000;
		console.log('^^^^ total', total);
		console.log('\n');
	}
})();
