const DB_NAME = 'sanctuary_audio';
const DB_VERSION = 1;
const STORE_NAME = 'files';
const META_KEY = 'sanctuary_playlist';

type StoredSongMeta = {
  id: string;
  title: string;
  artist: string;
  duration: string;
  durationSecs: number;
  gradient: string;
  isUploaded: true;
};

let dbCache: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbCache) return Promise.resolve(dbCache);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => {
      dbCache = req.result;
      dbCache.onclose = () => { dbCache = null; };
      resolve(dbCache);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function saveAudioFile(songId: string, file: File): Promise<void> {
  const db = await openDB();
  const buf = await file.arrayBuffer();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({ data: buf, type: file.type || 'audio/mpeg' }, songId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadAudioFile(songId: string): Promise<string | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(songId);
    req.onsuccess = () => {
      const result = req.result;
      if (!result) { resolve(null); return; }
      const blob = new Blob([result.data], { type: result.type });
      resolve(URL.createObjectURL(blob));
    };
    req.onerror = () => reject(req.error);
  });
}

export async function removeAudioFile(songId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(songId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function savePlaylistMeta(songs: StoredSongMeta[]): void {
  try { localStorage.setItem(META_KEY, JSON.stringify(songs)); } catch {}
}

export function loadPlaylistMeta(): StoredSongMeta[] {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (raw) return JSON.parse(raw) as StoredSongMeta[];
  } catch {}
  return [];
}
