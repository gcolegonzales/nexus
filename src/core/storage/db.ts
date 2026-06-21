import { openDB, type IDBPDatabase } from "idb";
import {
  CURRENT_SCHEMA_VERSION,
  DB_NAME,
  DB_VERSION,
  STORAGE_KEYS,
  STORE_NAME,
} from "./keys";

type NexusDb = IDBPDatabase;

let dbPromise: Promise<NexusDb> | null = null;

function getDb(): Promise<NexusDb> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });
  }

  return dbPromise;
}

export async function getItem<T>(key: string): Promise<T | undefined> {
  const db = await getDb();
  return db.get(STORE_NAME, key) as Promise<T | undefined>;
}

export async function setItem<T>(key: string, value: T): Promise<void> {
  const db = await getDb();
  await db.put(STORE_NAME, value, key);
}

export async function removeItem(key: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_NAME, key);
}

export async function clearAll(): Promise<void> {
  const db = await getDb();
  await db.clear(STORE_NAME);
}

export async function ensureSchemaVersion(): Promise<void> {
  const existing = await getItem<number>(STORAGE_KEYS.schemaVersion);
  if (existing === undefined) {
    await setItem(STORAGE_KEYS.schemaVersion, CURRENT_SCHEMA_VERSION);
  }
}
