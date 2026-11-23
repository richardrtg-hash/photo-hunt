// On-device storage (IndexedDB). Game state lives in the "kv" store,
// photos (resized JPEG blobs) live in the "photos" store.
// Everything photo-related goes through putPhoto/getPhoto/deletePhoto so a
// cloud backend (e.g. Google Drive) can be added later without touching the views.

const DB_NAME = 'photo-hunt';
const DB_VERSION = 1;
const STATE_KEY = 'state';

let dbPromise;

function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
        if (!db.objectStoreNames.contains('photos')) {
          const photos = db.createObjectStore('photos', { keyPath: 'id' });
          photos.createIndex('playerId', 'playerId');
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

async function run(storeName, mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const result = fn(tx.objectStore(storeName));
    tx.oncomplete = () => resolve(result instanceof IDBRequest ? result.result : result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Storage transaction aborted'));
  });
}

export const loadState = () => run('kv', 'readonly', (s) => s.get(STATE_KEY));
export const saveState = (state) => run('kv', 'readwrite', (s) => s.put(state, STATE_KEY));

export const putPhoto = (rec) => run('photos', 'readwrite', (s) => s.put(rec));
export const getPhoto = (id) => run('photos', 'readonly', (s) => s.get(id));
export const deletePhoto = (id) => run('photos', 'readwrite', (s) => s.delete(id));
export const allPhotos = () => run('photos', 'readonly', (s) => s.getAll());
export const hasPhoto = (id) => run('photos', 'readonly', (s) => s.count(id)).then((n) => n > 0);

export async function deletePhotosForPlayer(playerId) {
  return run('photos', 'readwrite', (s) => {
    const req = s.index('playerId').openKeyCursor(IDBKeyRange.only(playerId));
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) { s.delete(cursor.primaryKey); cursor.continue(); }
    };
  });
}

export async function clearAll() {
  await run('kv', 'readwrite', (s) => s.clear());
  await run('photos', 'readwrite', (s) => s.clear());
}

export async function requestPersistence() {
  try {
    if (navigator.storage?.persisted && (await navigator.storage.persisted())) return true;
    return (await navigator.storage?.persist?.()) ?? false;
  } catch { return false; }
}

export async function usage() {
  try { return await navigator.storage?.estimate?.(); } catch { return null; }
}
