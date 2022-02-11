const {
	sparseMerkleTree: { SparseMerkleTree },
	SkipMerkleTree,
} = require('@liskhq/lisk-tree');
const { KVStore, InMemoryKVStore } = require('@liskhq/lisk-db');
const { getRandomBytes, hash } = require('@liskhq/lisk-cryptography');
const { SMTStore } = require('@liskhq/lisk-chain');

const db = new KVStore('./state.db');
// const db = new InMemoryKVStore();
let kvdata = [];
let smtRoot;
let skmtRoot;

const measureSMT = async (iteration, keep) => {
	const next = [];
	const keys = [];
	const values = [];
	for (let i = 0; i < iteration; i += 1) {
		if (keep) {
			const nextKey = kvdata[i] ? kvdata[i].key : getRandomBytes(32);
			next.push({
				key: nextKey,
				value: getRandomBytes(32),
			});
			keys.push(nextKey);
			values.push(getRandomBytes(32));
		} else {
			next.push({
				key: getRandomBytes(32),
				value: getRandomBytes(32),
			});
			keys.push(getRandomBytes(32));
			values.push(getRandomBytes(32));
		}
	}
	kvdata = next;
	const smtStore = new SMTStore(db);
	const smt = new SparseMerkleTree({ db: smtStore, rootHash: smtRoot, keyLength: 32 });
	console.time('smt-batch');
	console.time('smt-update-batch');
	await smt.update(keys, values);
	console.timeEnd('smt-update-batch');
	console.time('smt-save-batch');
	const batch = db.batch();
	smtStore.finalize(batch);
	await batch.write();
	smtRoot = smt.rootHash;
	console.timeEnd('smt-save-batch');
	console.timeEnd('smt-batch');
	console.log(smt.rootHash.toString('hex'));
};

const measureSKMT = async (iteration, keep) => {
	const next = [];
	const keys = [];
	const values = [];
	for (let i = 0; i < iteration; i += 1) {
		if (keep) {
			const nextKey = kvdata[i] ? kvdata[i].key : getRandomBytes(32);
			next.push({
				key: nextKey,
				value: getRandomBytes(32),
			});
			keys.push(nextKey);
			values.push(getRandomBytes(32));
		} else {
			next.push({
				key: getRandomBytes(32),
				value: getRandomBytes(32),
			});
			keys.push(getRandomBytes(32));
			values.push(getRandomBytes(32));
		}
	}
	kvdata = next;
	const smtStore = new SMTStore(db);
	const smt = new SkipMerkleTree({ db: smtStore, rootHash: skmtRoot, keyLength: 32 });
	console.time('skmt-batch');
	console.time('skmt-update-batch');
	await smt.update(keys, values);
	console.timeEnd('skmt-update-batch');
	console.time('skmt-save-batch');
	const batch = db.batch();
	smtStore.finalize(batch);
	await batch.write();
	skmtRoot = smt.rootHash;
	console.timeEnd('skmt-save-batch');
	console.timeEnd('skmt-batch');
	console.log(smt.rootHash.toString('hex'));
};

(async () => {
	let total = 0;
	for (let i = 0; i < 1000; i++) {
		console.log('iteration batch update', 10000);
		await measureSMT(10000);
		console.log('\n');
		await measureSKMT(10000);
		total += 10000;
		console.log('^^^^ total', total);
		console.log('\n');
	}
})();
