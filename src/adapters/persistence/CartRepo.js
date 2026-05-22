// JavaScript IndexedDB adapter for cart persistence
// Implements CartRepository interface used by use cases

const DB_NAME = 'shop-cart-db';
const STORE_NAME = 'shop-cart';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (ev) => {
      const db = ev.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db, store, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    const req = fn(s);
    t.oncomplete = () => resolve(req.result);
    t.onerror = () => reject(t.error);
  });
}

// Reconstruct a plain cart item record into a CartItem instance with Shoe
async function reconstructCartItem(raw) {
  const { Shoe } = await import('../../domain/models/Shoe.js');
  const { CartItem } = await import('../../domain/models/CartItem.js');
  const shoe = new Shoe(raw.shoe);
  return new CartItem({ id: raw.id, shoe, quantity: raw.quantity });
}

export class CartRepo {
  constructor() {
    this._dbPromise = null;
  }

  async db() {
    if (!this._dbPromise) this._dbPromise = openDB();
    return this._dbPromise;
  }

  async getItems() {
    const database = await this.db();
    const raw = await tx(database, STORE_NAME, 'readonly', s => s.getAll());
    const items = [];
    for (const r of raw) {
      items.push(await reconstructCartItem(r));
    }
    return items;
  }

  async addItem(item) {
    const database = await this.db();
    // item is a CartItem instance — use toPlain() for serialisable record
    await tx(database, STORE_NAME, 'readwrite', s => s.put(item.toPlain()));
  }

  async removeItem(cartItemId) {
    const database = await this.db();
    await tx(database, STORE_NAME, 'readwrite', s => s.delete(cartItemId));
  }

  async updateQuantity(cartItemId, quantity) {
    const database = await this.db();
    const raw = await tx(database, STORE_NAME, 'readwrite', s => s.get(cartItemId));
    if (raw) {
      raw.quantity = quantity;
      await tx(database, STORE_NAME, 'readwrite', s => s.put(raw));
    }
  }

  async clear() {
    const database = await this.db();
    await tx(database, STORE_NAME, 'readwrite', s => s.clear());
  }
}