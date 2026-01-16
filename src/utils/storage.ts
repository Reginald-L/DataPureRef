import { openDB, DBSchema } from 'idb';

interface CanvasDB extends DBSchema {
  store: {
    key: string;
    value: any;
  };
  files: {
    key: string;
    value: Blob;
  };
}

const DB_NAME = 'canvas-db';
const DB_VERSION = 2;

export const dbPromise = openDB<CanvasDB>(DB_NAME, DB_VERSION, {
  upgrade(db, oldVersion) {
    if (oldVersion < 1) {
      db.createObjectStore('store');
    }
    if (oldVersion < 2) {
      db.createObjectStore('files');
    }
  },
});

export const saveFile = async (file: Blob): Promise<string> => {
  const db = await dbPromise;
  // Generate a simple ID. 
  // We could use crypto.randomUUID() if available, or a simple random string.
  // Since we are in a browser environment where crypto.randomUUID might be available.
  const fileId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
  
  await db.put('files', file, fileId);
  return fileId;
};

export const getFile = async (fileId: string): Promise<Blob | undefined> => {
  const db = await dbPromise;
  return db.get('files', fileId);
};

export const deleteFile = async (fileId: string): Promise<void> => {
  const db = await dbPromise;
  await db.delete('files', fileId);
};
