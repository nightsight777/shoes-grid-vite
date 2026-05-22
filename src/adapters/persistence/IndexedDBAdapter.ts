/**
 * IndexedDB persistence adapter implementing:
 *   - ShoeRepository   (domain/ports/ShoeRepository)
 *   - CartRepository   (domain/ports/CartRepository)
 *   - CacheRepository  (domain/ports/RepositoryPorts)
 *
 * All domain models are serialized as plain JSON. IndexedDB stores:
 *   shoes  — ShoeAttributes (keyPath: id)
 *   cart    — CartItemAttributes (keyPath: id)
 *   cache   — ShoeCacheEntry (keyPath: modelId)
 */
import { Shoe } from '../../domain/models/Shoe';
import type { ShoeAttributes } from '../../domain/models/Shoe';
import { CartItem } from '../../domain/models/CartItem';
import type { CartItemAttributes } from '../../domain/models/CartItem';
import type { ShoeRepository } from '../../domain/ports/ShoeRepository';
import type { CartRepository } from '../../domain/ports/CartRepository';
import type { CacheRepository, ShoeCacheEntry } from '../../domain/ports/RepositoryPorts';

// ─── Database setup ───────────────────────────────────────────────────────────

const DB_NAME    = 'shoes-grid-db';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (ev) => {
      const db = (ev.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('shoes')) {
        db.createObjectStore('shoes', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('cart')) {
        db.createObjectStore('cart', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('cache')) {
        const cs = db.createObjectStore('cache', { keyPath: 'modelId' });
        cs.createIndex('lastAccessed', 'lastAccessed', { unique: false });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

// ─── Generic transaction helper ───────────────────────────────────────────────

function tx<T>(
  db: IDBDatabase,
  store: string,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const t     = db.transaction(store, mode);
    const s     = t.objectStore(store);
    const req   = fn(s);
    t.oncomplete = () => resolve(req.result as T);
    t.onerror    = () => reject(t.error);
  });
}

// ─── IndexedDBAdapter ─────────────────────────────────────────────────────────

export class IndexedDBAdapter {
  private _db = openDB();

  private async db(): Promise<IDBDatabase> {
    return this._db;
  }

  // ─── ShoeRepository ────────────────────────────────────────────────────────

  async findAll(): Promise<Shoe[]> {
    const database = await this.db();
    const raw: ShoeAttributes[] = await tx(database, 'shoes', 'readonly', s => s.getAll());
    return raw.map(a => new Shoe(a));
  }

  async findById(id: string): Promise<Shoe | null> {
    const database = await this.db();
    const raw: ShoeAttributes | undefined = await tx(database, 'shoes', 'readonly', s => s.get(id));
    return raw ? new Shoe(raw) : null;
  }

  async findByModelIndex(modelIndex: number): Promise<Shoe[]> {
    const database = await this.db();
    const raw: ShoeAttributes[] = await tx(database, 'shoes', 'readonly', s => s.getAll());
    return raw.filter(r => r.modelIndex === modelIndex).map(a => new Shoe(a));
  }

  // ─── CartRepository ─────────────────────────────────────────────────────────

  async getItems(): Promise<CartItem[]> {
    const database = await this.db();
    const raw: CartItemAttributes[] = await tx(database, 'cart', 'readonly', s => s.getAll());
    return raw.map(r => {
      const shoe = new Shoe(r.shoe as ShoeAttributes);
      return new CartItem({ id: r.id, shoe, quantity: r.quantity });
    });
  }

  async addItem(item: CartItem): Promise<void> {
    const database = await this.db();
    await tx(database, 'cart', 'readwrite', s => s.put(item.toPlain()));
  }

  async removeItem(cartItemId: string): Promise<void> {
    const database = await this.db();
    await tx(database, 'cart', 'readwrite', s => s.delete(cartItemId));
  }

  async updateQuantity(cartItemId: string, quantity: number): Promise<void> {
    const database = await this.db();
    const raw: CartItemAttributes | undefined = await tx(
      database, 'cart', 'readwrite', s => s.get(cartItemId)
    );
    if (raw) {
      raw.quantity = quantity;
      await tx(database, 'cart', 'readwrite', s => s.put(raw));
    }
  }

  async clearCart(): Promise<void> {
    const database = await this.db();
    await tx(database, 'cart', 'readwrite', s => s.clear());
  }

  // Alias so this adapter satisfies CartRepository.clear()
  async clear(): Promise<void> {
    return this.clearCart();
  }

  // ─── CacheRepository ───────────────────────────────────────────────────────

  async getCache(modelId: string): Promise<ShoeCacheEntry | null> {
    const database = await this.db();
    return tx(database, 'cache', 'readonly', s => s.get(modelId));
  }

  async setCache(modelId: string, entry: Omit<ShoeCacheEntry, 'modelId'>): Promise<void> {
    const database = await this.db();
    await tx(database, 'cache', 'readwrite', s => s.put({ modelId, ...entry }));
  }

  async evictCache(modelId: string): Promise<void> {
    const database = await this.db();
    await tx(database, 'cache', 'readwrite', s => s.delete(modelId));
  }

  async getAllCache(): Promise<ShoeCacheEntry[]> {
    const database = await this.db();
    const rows: ShoeCacheEntry[] = await tx(database, 'cache', 'readonly', s => s.getAll());
    return rows.sort((a, b) => b.lastAccessed - a.lastAccessed);
  }

  async clearCache(): Promise<void> {
    const database = await this.db();
    await tx(database, 'cache', 'readwrite', s => s.clear());
  }

  /** Remove a shoe record and its cache entry together (used by delete). */
  async deleteWithCache(id: string): Promise<void> {
    const database = await this.db();
    const t = database.transaction(['shoes', 'cache'], 'readwrite');
    t.objectStore('shoes').delete(id);
    t.objectStore('cache').delete(id);
    return new Promise((resolve, reject) => {
      t.oncomplete = () => resolve();
      t.onerror    = () => reject(t.error);
    });
  }
}

// ─── Factory compatible with all three port interfaces ─────────────────────────

export function createRepositories(): {
  shoeRepo:  ShoeRepository;
  cartRepo:  CartRepository;
  cacheRepo: CacheRepository;
} {
  const adapter = new IndexedDBAdapter();
  return {
    shoeRepo:  adapter as unknown as ShoeRepository,
    cartRepo:  adapter as unknown as CartRepository,
    cacheRepo: adapter as unknown as CacheRepository,
  };
}