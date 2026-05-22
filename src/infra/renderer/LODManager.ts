/**
 * LODManager — tracks camera distance to each shoe and resolves LOD levels.
 *
 * Distance thresholds (world units, camera-to-object):
 *   < 2  → ultra  (full detail)
 *   < 5  → high
 *   < 10 → medium
 *   else → low
 *
 * All Three.js objects stay in the infra layer; domain has no Three.js imports.
 */
export enum LODLevel {
  Ultra   = 'ultra',
  High    = 'high',
  Medium  = 'medium',
  Low     = 'low',
}

export const LOD_DIST_ULTRA  = 2;
export const LOD_DIST_HIGH   = 5;
export const LOD_DIST_MEDIUM = 10;

const LOD_ORDER: LODLevel[] = [LODLevel.Ultra, LODLevel.High, LODLevel.Medium, LODLevel.Low];

/** Given a camera-to-shoe distance, return the appropriate LOD level. */
export function computeLODLevel(distance: number): LODLevel {
  if (distance < LOD_DIST_ULTRA)  return LODLevel.Ultra;
  if (distance < LOD_DIST_HIGH)   return LODLevel.High;
  if (distance < LOD_DIST_MEDIUM) return LODLevel.Medium;
  return LODLevel.Low;
}

/** Compare two LOD levels; returns positive if a > b (higher detail). */
export function lodRank(a: LODLevel, b: LODLevel): number {
  return LOD_ORDER.indexOf(a) - LOD_ORDER.indexOf(b);
}

export interface LODTarget {
  /** Called every frame with the current LOD level for this target. */
  setLODLevel(level: LODLevel): void;
}

export class LODManager {
  /** Map of shoe group uuid → current LOD level */
  private currentLevels = new Map<string, LODLevel>();

  /** Register a target (e.g. a shoe group wrapper) with an initial LOD level. */
  register(id: string, initialLevel: LODLevel): void {
    this.currentLevels.set(id, initialLevel);
  }

  /** Unregister a target. */
  unregister(id: string): void {
    this.currentLevels.delete(id);
  }

  /**
   * Update the LOD level for a given target based on the measured distance.
   * Returns the new LOD level if it changed, otherwise null.
   */
  updateDistance(id: string, distance: number): LODLevel | null {
    const newLevel = computeLODLevel(distance);
    const prev = this.currentLevels.get(id);

    if (prev === newLevel) return null;

    this.currentLevels.set(id, newLevel);
    return newLevel;
  }

  /** Get the current LOD level for a registered target. */
  getLevel(id: string): LODLevel {
    return this.currentLevels.get(id) ?? LODLevel.Low;
  }
}