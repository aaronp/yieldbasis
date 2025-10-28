/**
 * Storage abstraction layer
 * Supports both in-memory and IndexedDB implementations
 */

export interface IStorage {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  has(key: string): Promise<boolean>;
  keys(): Promise<string[]>;
  clear(): Promise<void>;
}

export interface StorageOptions {
  dbName?: string;
  version?: number;
}
