// Wrapper mínimo sobre IndexedDB (sem dependências). Tudo fica no navegador do usuário.
const DB_NAME = 'gus-utilitybelt';
const DB_VERSION = 1;
const STORE = 'nodes';

export type StoredNode = { path: string; kind: 'file' | 'dir'; content?: string };

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
	if (!dbPromise) {
		dbPromise = new Promise((resolve, reject) => {
			const req = indexedDB.open(DB_NAME, DB_VERSION);
			req.onupgradeneeded = () => {
				if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: 'path' });
			};
			req.onsuccess = () => resolve(req.result);
			req.onerror = () => reject(req.error);
		});
	}
	return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
	return open().then(
		(db) =>
			new Promise<T>((resolve, reject) => {
				const t = db.transaction(STORE, mode);
				const req = fn(t.objectStore(STORE));
				t.oncomplete = () => resolve(req.result);
				t.onerror = () => reject(t.error);
			})
	);
}

export const idb = {
	all: () => tx<StoredNode[]>('readonly', (s) => s.getAll()),
	put: (node: StoredNode) => tx('readwrite', (s) => s.put(node)),
	remove: (path: string) => tx('readwrite', (s) => s.delete(path)),
	clear: () => tx('readwrite', (s) => s.clear())
};
