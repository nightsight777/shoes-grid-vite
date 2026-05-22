/**
 * Domain port: repository for shoe model metadata.
 * No Three.js imports — only plain serializable data.
 */
export interface ShoeModelRecord {
  id: string;
  name: string;
  /** URL to the high-quality GLB asset */
  highUrl: string;
  /** URL to the medium-quality LOD GLB asset */
  mediumUrl: string;
  /** URL to the low-quality LOD GLB asset */
  lowUrl: string;
  /** Display order index */
  sortOrder: number;
}

/**
 * Domain port: repository for caching rendered shoe instances.
 */
export interface ShoeCacheEntry {
  modelId: string;
  /** ISO timestamp of when this entry was last accessed */
  lastAccessed: number;
  /** Number of times this shoe was instantiated */
  usageCount: number;
}

export interface ShoeRepository {
  /** Return all registered shoe model records sorted by sortOrder. */
  findAll(): Promise<ShoeModelRecord[]>;

  /** Return a single shoe model record by id, or null if not found. */
  findById(id: string): Promise<ShoeModelRecord | null>;

  /** Register a new shoe model record. Idempotent (upsert by id). */
  upsert(record: ShoeModelRecord): Promise<void>;

  /** Remove a shoe model record and its cache entry. */
  delete(id: string): Promise<void>;
}

export interface CacheRepository {
  /** Return the cache entry for a given modelId, or null if absent. */
  get(modelId: string): Promise<ShoeCacheEntry | null>;

  /** Upsert a cache entry for the given modelId. */
  set(modelId: string, entry: Omit<ShoeCacheEntry, 'modelId'>): Promise<void>;

  /** Remove a cache entry. */
  evict(modelId: string): Promise<void>;

  /** Return all cache entries sorted by lastAccessed descending. */
  getAll(): Promise<ShoeCacheEntry[]>;

  /** Clear the entire cache. */
  clear(): Promise<void>;
}