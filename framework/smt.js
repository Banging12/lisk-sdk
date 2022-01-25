const {
	sparseMerkleTree: { SparseMerkleTree },
} = require('@liskhq/lisk-tree');
const { KVStore, InMemoryKVStore } = require('@liskhq/lisk-db');
const { getRandomBytes, hash } = require('@liskhq/lisk-cryptography');
const { SMTStore } = require('@liskhq/lisk-chain');

const db = new KVStore('./state.db');
// const db = new InMemoryKVStore();
let kvdata = [];
let root;
let total = 0;

const measure = async (iteration, keep) => {
	const next = [];
	for (let i = 0; i < iteration; i += 1) {
		if (keep) {
			const nextKey = kvdata[i] ? kvdata[i].key : getRandomBytes(50);
			next.push({
				key: nextKey,
				value: getRandomBytes(200),
			});
		} else {
			next.push({
				key: getRandomBytes(50),
				value: getRandomBytes(200),
			});
		}
	}
	kvdata = next;
	const smtStore = new SMTStore(db);
	const smt = new SparseMerkleTree({ db: smtStore, rootHash: root, keyLength: 38 });
	console.time('smt');
	console.time('smt-update');
	for (const data of kvdata) {
		// await smt.update(Buffer.concat([data.key.slice(1, 7), hash(data.key.slice(7))]), hash(data.value))
		await smt.update(getRandomBytes(38), getRandomBytes(32));
	}
	console.timeEnd('smt-update');
	console.time('smt-save');
	const batch = db.batch();
	smtStore.finalize(batch);
	await batch.write();
	root = smt.rootHash;
	console.timeEnd('smt-save');
	console.timeEnd('smt');
	console.log(smt.rootHash.toString('hex'));
};

const measureBatch = async (iteration, keep) => {
	const next = [];
	const keys = [];
	const values = [];
	for (let i = 0; i < iteration; i += 1) {
		if (keep) {
			const nextKey = kvdata[i] ? kvdata[i].key : getRandomBytes(38);
			next.push({
				key: nextKey,
				value: getRandomBytes(200),
			});
			keys.push(nextKey);
			values.push(getRandomBytes(200));
		} else {
			next.push({
				key: getRandomBytes(38),
				value: getRandomBytes(200),
			});
			keys.push(getRandomBytes(38));
			values.push(getRandomBytes(200));
		}
	}
	kvdata = next;
	const smtStore = new SMTStore(db);
	const smt = new SparseMerkleTree({ db: smtStore, rootHash: root, keyLength: 38 });
	console.time('smt-batch');
	console.time('smt-update-batch');
	await smt.updateBatch(keys, values);
	console.timeEnd('smt-update-batch');
	console.time('smt-save-batch');
	const batch = db.batch();
	smtStore.finalize(batch);
	await batch.write();
	root = smt.rootHash;
	console.timeEnd('smt-save-batch');
	console.timeEnd('smt-batch');
	console.log(smt.rootHash.toString('hex'));
};

const measureHash = iteration => {
	const next = [];
	for (let i = 0; i < iteration; i += 1) {
		next.push(getRandomBytes(1500));
	}

	console.time('hash');
	for (const d of next) {
		hash(d);
	}
	console.timeEnd('hash');
};

(async () => {
	// measureHash(20000);
	console.log('iteration', 100);
	// await measure(100);
	await measureBatch(100);
	total += 100;
	console.log('total', total);

	console.log('iteration', 1000);
	// await measure(1000);
	await measureBatch(1000);
	total += 1000;
	console.log('total', total);
	// 10,000,000

	for (let i = 0; i < 1000; i++) {
		// console.log('v'.repeat(100));
		// console.log('iteration update', 10000);
		// await measure(10000);
		// console.log('^'.repeat(100));
		console.log('v'.repeat(100));
		console.log('iteration batch update', 10000);
		await measureBatch(10000);
		console.log('^'.repeat(100));
		total += 10000;
		console.log('^^^^ total', total);
	}

	for (let i = 0; i < 10; i++) {
		console.log('vvvv iteration', 5000);
		await measure(5000);
		// await measureBatch(5000);
		total += 5000;
		console.log('^^^^ total', total);
	}
	for (let i = 0; i < 10; i++) {
		console.log('vvvv iteration', 5000);
		await measure(5000, true);
		console.log('^^^^ total', total);
	}
})();
