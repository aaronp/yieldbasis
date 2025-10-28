import { IStorage, StorageOptions } from './storage.types';

/**
 * IndexedDB storage implementation
 * Provides persistent key-value storage
 */
export class IndexedDBStorage implements IStorage {
  private dbName: string;
  private storeName = 'keyvalue';
  private version: number;
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor(options: StorageOptions = {}) {
    this.dbName = options.dbName || 'app-storage';
    this.version = options.version || 1;
  }

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        reject(new Error(`Failed to open database: ${request.error}`));
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });

    return this.dbPromise;
  }

  private async transaction<T>(
    mode: IDBTransactionMode,
    callback: (store: IDBObjectStore) => IDBRequest<T>
  ): Promise<T> {
    const db = await this.getDB();
    const tx = db.transaction(this.storeName, mode);
    const store = tx.objectStore(this.storeName);
    const request = callback(store);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const result = await this.transaction('readonly', (store) => store.get(key));
      return result ?? null;
    } catch (error) {
      console.error('IndexedDB get error:', error);
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      await this.transaction('readwrite', (store) => store.put(value, key));
    } catch (error) {
      console.error('IndexedDB set error:', error);
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.transaction('readwrite', (store) => store.delete(key));
    } catch (error) {
      console.error('IndexedDB delete error:', error);
      throw error;
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      const result = await this.transaction('readonly', (store) => store.getKey(key));
      return result !== undefined;
    } catch (error) {
      console.error('IndexedDB has error:', error);
      return false;
    }
  }

  async keys(): Promise<string[]> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const request = store.getAllKeys();

      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result as string[]);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('IndexedDB keys error:', error);
      return [];
    }
  }

  async clear(): Promise<void> {
    try {
      await this.transaction('readwrite', (store) => store.clear());
    } catch (error) {
      console.error('IndexedDB clear error:', error);
      throw error;
    }
  }
}
