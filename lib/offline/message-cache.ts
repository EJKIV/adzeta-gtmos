/**
 * IndexedDB-based offline message cache.
 *
 * Stores unsaved chat messages locally when the server is unreachable.
 * When connectivity returns, pending messages can be flushed to the API.
 *
 * Uses raw IndexedDB to avoid adding a dependency (idb).
 */

const DB_NAME = 'gtm-os-offline';
const DB_VERSION = 1;
const STORE_NAME = 'pending-messages';

interface PendingMessage {
  /** Auto-incremented key */
  id?: number;
  sessionId: string;
  clientId: string;
  type: 'command' | 'response';
  text?: string;
  output?: Record<string, unknown>;
  createdAt: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('sessionId', 'sessionId', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Queue a message for later sync when the server is unavailable.
 */
export async function queueMessage(msg: Omit<PendingMessage, 'id'>): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).add(msg);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // IndexedDB unavailable (e.g., private browsing in old Safari) — non-critical
  }
}

/**
 * Get all pending (unsent) messages, optionally filtered by session.
 */
export async function getPendingMessages(sessionId?: string): Promise<PendingMessage[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    const messages: PendingMessage[] = await new Promise((resolve, reject) => {
      const request = sessionId
        ? store.index('sessionId').getAll(sessionId)
        : store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    db.close();
    return messages;
  } catch {
    return [];
  }
}

/**
 * Remove specific messages after successful sync.
 */
export async function removePendingMessages(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    for (const id of ids) {
      store.delete(id);
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // non-critical
  }
}

/**
 * Flush all pending messages to the server.
 * Returns the count of successfully synced messages.
 */
export async function flushPendingMessages(): Promise<number> {
  const pending = await getPendingMessages();
  if (pending.length === 0) return 0;

  const synced: number[] = [];

  let consecutiveFailures = 0;

  for (const msg of pending) {
    try {
      const res = await fetch(`/api/sessions/${msg.sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: msg.clientId,
          type: msg.type,
          text: msg.text,
          output: msg.output,
        }),
      });
      if (res.ok && msg.id !== undefined) {
        synced.push(msg.id);
        consecutiveFailures = 0;
      }
    } catch {
      consecutiveFailures += 1;
      // Server truly unreachable — stop after 3 consecutive network failures
      if (consecutiveFailures >= 3) break;
    }
  }

  await removePendingMessages(synced);
  return synced.length;
}
