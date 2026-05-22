/**
 * LODShoeRenderer — wraps the existing shoe.js loading logic and exposes
 * an LOD-aware interface built on top of the Three.js infra layer.
 *
 * Loads three quality tiers per model (high / medium / low) and swaps the
 * visible child based on camera distance via LODManager.
 *
 * All Three.js imports stay in the infra/adapters/threejs layer.
 * The domain layer has NO Three.js imports.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

import { LODManager, LODLevel } from '../../infra/renderer/LODManager';

// ─── Source paths ──────────────────────────────────────────────────────────
// ULTRA  → shoesRenderrs/  (original HD source, never optimized)
// HIGH   → shoes-lod/      (generated from HD, falls back to shoesRenderrs if missing)
// MEDIUM → shoes-lod/      (generated from HD)
// LOW    → shoes-lod/      (generated from HD)
import { existsSync } from 'node:fs';
import { join } from 'node:path';

function lodPath(baseName: string, tier: 'high' | 'medium' | 'low'): string {
  const lod = join(__dirname, '..', '..', 'assets', 'shoes-lod', `${baseName}-${tier}.glb`);
  return existsSync(lod) ? lod : null;
}
function ultraPath(baseName: string): string {
  return join(__dirname, '..', '..', 'assets', 'shoesRenderrs', `${baseName}.glb`);
}

const MODEL_SOURCES = [
  // Nike Air
  {
    name: 'Nike Air',
    ultra: ultraPath('uploads_files_4278121_Nike_Air_Shoes'),
    high:   lodPath('uploads_files_4278121_Nike_Air_Shoes', 'high')   ?? ultraPath('uploads_files_4278121_Nike_Air_Shoes'),
    medium: lodPath('uploads_files_4278121_Nike_Air_Shoes', 'medium') ?? ultraPath('uploads_files_4278121_Nike_Air_Shoes'),
    low:    lodPath('uploads_files_4278121_Nike_Air_Shoes', 'low')   ?? ultraPath('uploads_files_4278121_Nike_Air_Shoes'),
  },
  // Runner
  {
    name: 'Runner',
    ultra: ultraPath('uploads_files_4741956_shoe+exp'),
    high:   lodPath('uploads_files_4741956_shoe+exp', 'high')   ?? ultraPath('uploads_files_4741956_shoe+exp'),
    medium: lodPath('uploads_files_4741956_shoe+exp', 'medium') ?? ultraPath('uploads_files_4741956_shoe+exp'),
    low:    lodPath('uploads_files_4741956_shoe+exp', 'low')   ?? ultraPath('uploads_files_4741956_shoe+exp'),
  },
  // Boots
  {
    name: 'Boots',
    ultra: ultraPath('uploads_files_6167869_Boots'),
    high:   lodPath('uploads_files_6167869_Boots', 'high')   ?? ultraPath('uploads_files_6167869_Boots'),
    medium: lodPath('uploads_files_6167869_Boots', 'medium') ?? ultraPath('uploads_files_6167869_Boots'),
    low:    lodPath('uploads_files_6167869_Boots', 'low')   ?? ultraPath('uploads_files_6167869_Boots'),
  },
  // Salomon XT6
  {
    name: 'Salomon XT6',
    ultra: ultraPath('salomon_xt6_sneaker_photo_scan'),
    high:   lodPath('salomon_xt6_sneaker_photo_scan', 'high')   ?? ultraPath('salomon_xt6_sneaker_photo_scan'),
    medium: lodPath('salomon_xt6_sneaker_photo_scan', 'medium') ?? ultraPath('salomon_xt6_sneaker_photo_scan'),
    low:    lodPath('salomon_xt6_sneaker_photo_scan', 'low')   ?? ultraPath('salomon_xt6_sneaker_photo_scan'),
  },
  // Vans Old Skool
  {
    name: 'Vans Old Skool',
    ultra: ultraPath('vans_old_skool_navy'),
    high:   lodPath('vans_old_skool_navy', 'high')   ?? ultraPath('vans_old_skool_navy'),
    medium: lodPath('vans_old_skool_navy', 'medium') ?? ultraPath('vans_old_skool_navy'),
    low:    lodPath('vans_old_skool_navy', 'low')   ?? ultraPath('vans_old_skool_navy'),
  },
  // Sneaker B33
  {
    name: 'Sneaker B33',
    ultra: ultraPath('sneaker_b33'),
    high:   lodPath('sneaker_b33', 'high')   ?? ultraPath('sneaker_b33'),
    medium: lodPath('sneaker_b33', 'medium') ?? ultraPath('sneaker_b33'),
    low:    lodPath('sneaker_b33', 'low')   ?? ultraPath('sneaker_b33'),
  },
  // Sneaker Vibe
  {
    name: 'Sneaker Vibe',
    ultra: ultraPath('sneaker_vibe'),
    high:   lodPath('sneaker_vibe', 'high')   ?? ultraPath('sneaker_vibe'),
    medium: lodPath('sneaker_vibe', 'medium') ?? ultraPath('sneaker_vibe'),
    low:    lodPath('sneaker_vibe', 'low')   ?? ultraPath('sneaker_vibe'),
  },
  // Sneakers
  {
    name: 'Sneakers',
    ultra: ultraPath('sneakers'),
    high:   lodPath('sneakers', 'high')   ?? ultraPath('sneakers'),
    medium: lodPath('sneakers', 'medium') ?? ultraPath('sneakers'),
    low:    lodPath('sneakers', 'low')   ?? ultraPath('sneakers'),
  },
  // Sneakers Seen
  {
    name: 'Sneakers Seen',
    ultra: ultraPath('sneakers_seen'),
    high:   lodPath('sneakers_seen', 'high')   ?? ultraPath('sneakers_seen'),
    medium: lodPath('sneakers_seen', 'medium') ?? ultraPath('sneakers_seen'),
    low:    lodPath('sneakers_seen', 'low')   ?? ultraPath('sneakers_seen'),
  },
  // 3D Scan Sneaker
  {
    name: '3D Scan Sneaker',
    ultra: ultraPath('reserved_shoe_sneakers_3d_scan'),
    high:   lodPath('reserved_shoe_sneakers_3d_scan', 'high')   ?? ultraPath('reserved_shoe_sneakers_3d_scan'),
    medium: lodPath('reserved_shoe_sneakers_3d_scan', 'medium') ?? ultraPath('reserved_shoe_sneakers_3d_scan'),
    low:    lodPath('reserved_shoe_sneakers_3d_scan', 'low')   ?? ultraPath('reserved_shoe_sneakers_3d_scan'),
  },
];

export const MODEL_COUNT = MODEL_SOURCES.length;
export const MODEL_NAMES = MODEL_SOURCES.map(m => m.name);

// ─── Internal loader cache ────────────────────────────────────────────────────

let gltfLoader: GLTFLoader | null = null;

function getLoader(renderer: THREE.WebGLRenderer): GLTFLoader {
  if (gltfLoader) return gltfLoader;
  const ktx2 = new KTX2Loader()
    .setTranscoderPath('/basis/')
    .detectSupport(renderer);
  gltfLoader = new GLTFLoader()
    .setMeshoptDecoder(MeshoptDecoder)
    .setKTX2Loader(ktx2);
  return gltfLoader;
}

function toStandardMaterial(m: THREE.Material): THREE.MeshStandardMaterial {
  if (m instanceof THREE.MeshStandardMaterial) return m;
  const s = new THREE.MeshStandardMaterial();
  if (m instanceof THREE.MeshBasicMaterial) return s;
  const src = m as THREE.MeshPhysicalMaterial;
  if (src.color) s.color.copy(src.color);
  if ((src as unknown as Record<string, unknown>).map) s.map = (src as unknown as { map: THREE.Texture }).map;
  if (src.normalMap) s.normalMap = src.normalMap;
  if (src.emissive) s.emissive.copy(src.emissive);
  if (src.emissiveMap) s.emissiveMap = src.emissiveMap;
  s.transparent = src.transparent ?? false;
  s.opacity = src.opacity ?? 1;
  s.roughness = 0.6;
  s.metalness = 0.05;
  if (!s.map && s.color.r + s.color.g + s.color.b < 0.15) {
    s.color.setRGB(0.82, 0.82, 0.82);
  }
  return s;
}

function normalizeMaterials(root: THREE.Object3D): void {
  const cache = new Map<THREE.Material, THREE.Material>();
  root.traverse(child => {
    if (!(child instanceof THREE.Mesh) || !child.material) return;
    const remap = (m: THREE.Material) => {
      if (cache.has(m)) return cache.get(m)!;
      const next = toStandardMaterial(m);
      cache.set(m, next);
      return next;
    };
    child.material = Array.isArray(child.material)
      ? child.material.map(remap)
      : remap(child.material);
  });
}

function prepareTemplate(root: THREE.Object3D): THREE.Group {
  root.traverse(child => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = false;
      child.receiveShadow = false;
    }
  });
  normalizeMaterials(root);

  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const targetHeight = 0.75;
  const scale = targetHeight / Math.max(size.x, size.y, size.z);
  root.scale.setScalar(scale);
  root.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
  root.updateMatrixWorld(true);

  const group = new THREE.Group();
  group.add(root);
  return group;
}

// ─── Per-model LOD variant descriptors ──────────────────────────────────────

/** A single LOD variant of a shoe model — wraps a loaded Three.js group. */
interface LODVariant {
  level: LODLevel;
  group: THREE.Group;
}

/** All three LOD variants for a single shoe model index. */
interface ModelLODSet {
  [LODLevel.Ultra]:  LODVariant;
  [LODLevel.High]:   LODVariant;
  [LODLevel.Medium]: LODVariant;
  [LODLevel.Low]:    LODVariant;
}

// ─── LODShoeRenderer ─────────────────────────────────────────────────────────

export class LODShoeRenderer {
  /** Maps modelIndex → all three LOD variants. */
  private lodSets: ModelLODSet[] = [];

  private readonly renderer: THREE.WebGLRenderer;
  private readonly lodManager: LODManager;

  constructor(renderer: THREE.WebGLRenderer, lodManager: LODManager) {
    this.renderer = renderer;
    this.lodManager = lodManager;
  }

  // ─── Loading ───────────────────────────────────────────────────────────────

  /**
   * Load all LOD variants for every model.
   * For now we load the same GLB for all tiers; downstream a build step
   * (see scripts/generate-lods.mjs) creates medium / low simplified copies.
   */
  async loadAll(): Promise<void> {
    await Promise.all(MODEL_SOURCES.map((src, i) => this.loadOne(i, src)));
  }

  private async loadOne(modelIndex: number, src: typeof MODEL_SOURCES[number]): Promise<void> {
    const loader = getLoader(this.renderer);
    const [ultraGltf, highGltf, mediumGltf, lowGltf] = await Promise.all([
      loader.loadAsync(src.ultra),
      loader.loadAsync(src.high),
      loader.loadAsync(src.medium),
      loader.loadAsync(src.low),
    ]);

    const toGroup = (gltf: { scene: THREE.Group }) => prepareTemplate(gltf.scene);

    this.lodSets[modelIndex] = {
      [LODLevel.Ultra]:  { level: LODLevel.Ultra,  group: toGroup(ultraGltf) },
      [LODLevel.High]:   { level: LODLevel.High,   group: toGroup(highGltf) },
      [LODLevel.Medium]: { level: LODLevel.Medium, group: toGroup(mediumGltf) },
      [LODLevel.Low]:    { level: LODLevel.Low,    group: toGroup(lowGltf) },
    };
  }

  private cloneGroup(src: THREE.Group): THREE.Group {
    const clone = src.clone(true);
    clone.traverse(child => {
      if (child instanceof THREE.Mesh) {
        if (child.material) {
          child.material = Array.isArray(child.material)
            ? child.material.map(m => m.clone())
            : (child.material as THREE.Material).clone();
        }
        child.castShadow = false;
        child.receiveShadow = false;
      }
    });
    return clone;
  }

  // ─── Shoe construction ─────────────────────────────────────────────────────

  /**
   * Build a shoe group for the given modelIndex with LOD support.
   * The group holds all four LOD variants as children; only one is visible at a time.
   *
   * @param modelIndex  index into MODEL_SOURCES
   * @param id          unique identifier for this shoe instance (used by LODManager)
   */
  buildShoe(modelIndex: number, id: string): THREE.Group {
    const set = this.lodSets[modelIndex % this.lodSets.length];
    if (!set) throw new Error(`LODShoeRenderer: model ${modelIndex} not loaded`);

    const group = new THREE.Group();
    group.userData.modelIndex = modelIndex % MODEL_SOURCES.length;
    group.userData.shoeId = id;

    // Add all LOD variants as children; only one is visible at a time.
    for (const level of [LODLevel.Ultra, LODLevel.High, LODLevel.Medium, LODLevel.Low]) {
      const variant = set[level];
      variant.group.visible = level === LODLevel.Ultra; // default to ultra
      group.add(variant.group);
    }

    // Register with LODManager at ultra (highest) level initially.
    this.lodManager.register(id, LODLevel.Ultra);

    return group;
  }

  /**
   * Called each frame for every shoe. Updates visible LOD based on camera distance.
   *
   * @param shoe   the shoe group returned by buildShoe()
   * @param camera the active Three.js camera
   */
  updateLOD(shoe: THREE.Group, camera: THREE.Camera): void {
    const id = shoe.userData.shoeId as string | undefined;
    if (!id) return;

    // Compute camera → shoe center distance.
    const box = new THREE.Box3().setFromObject(shoe);
    const center = box.getCenter(new THREE.Vector3());
    const distance = camera.position.distanceTo(center);

    const newLevel = this.lodManager.updateDistance(id, distance);
    if (!newLevel) return;

    // Swap visibility: hide all variants, show the target one.
    const set = this.lodSets[shoe.userData.modelIndex];
    for (const level of [LODLevel.Ultra, LODLevel.High, LODLevel.Medium, LODLevel.Low]) {
      set[level].group.visible = level === newLevel;
    }
  }

  /** Remove a shoe from LOD tracking. */
  disposeShoe(shoe: THREE.Group): void {
    const id = shoe.userData.shoeId as string | undefined;
    if (id) this.lodManager.unregister(id);
  }
}