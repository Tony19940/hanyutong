const DB_NAME = 'hyt-offline';
const DB_VERSION = 1;
const CACHE_STORE = 'cache';
const QUEUE_STORE = 'queue';

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CACHE_STORE)) {
        db.createObjectStore(CACHE_STORE, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

async function withStore(storeName, mode, callback) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const request = callback(store);
    transaction.oncomplete = () => resolve(request?.result);
    transaction.onerror = () => reject(transaction.error || new Error('IndexedDB transaction failed'));
  });
}

export async function getCacheEntry(key) {
  return withStore(CACHE_STORE, 'readonly', (store) => store.get(key));
}

export async function setCacheEntry(key, value) {
  return withStore(CACHE_STORE, 'readwrite', (store) => store.put({
    key,
    value,
    updatedAt: new Date().toISOString(),
  }));
}

export async function enqueueOfflineAction(action) {
  return withStore(QUEUE_STORE, 'readwrite', (store) => store.add({
    ...action,
    createdAt: new Date().toISOString(),
  }));
}

export async function listOfflineActions() {
  return withStore(QUEUE_STORE, 'readonly', (store) => store.getAll());
}

export async function removeOfflineAction(id) {
  return withStore(QUEUE_STORE, 'readwrite', (store) => store.delete(id));
}
