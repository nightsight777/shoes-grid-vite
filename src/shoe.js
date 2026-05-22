import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

import nikeAirUrl    from './assets/shoes-optimized/uploads_files_4278121_Nike_Air_Shoes.glb?url';
import shoeExpUrl    from './assets/shoes-optimized/uploads_files_4741956_shoe+exp.glb?url';
import bootsUrl      from './assets/shoes-optimized/uploads_files_6167869_Boots.glb?url';
import salomonUrl    from './assets/shoes-optimized/salomon_xt6_sneaker_photo_scan.glb?url';
import vansUrl       from './assets/shoes-optimized/vans_old_skool_navy.glb?url';
import sneakerB33Url from './assets/shoes-optimized/sneaker_b33.glb?url';
import sneakerVibeUrl from './assets/shoes-optimized/sneaker_vibe.glb?url';
import sneakersUrl   from './assets/shoes-optimized/sneakers.glb?url';
import sneakersSeenUrl from './assets/shoes-optimized/sneakers_seen.glb?url';
import scanSneakerUrl from './assets/shoes-optimized/reserved_shoe_sneakers_3d_scan.glb?url';

const MODEL_SOURCES = [
  { url: nikeAirUrl,      name: 'Nike Air' },
  { url: shoeExpUrl,      name: 'Runner' },
  { url: bootsUrl,        name: 'Boots' },
  { url: salomonUrl,      name: 'Salomon XT6' },
  { url: vansUrl,         name: 'Vans Old Skool' },
  { url: sneakerB33Url,   name: 'Sneaker B33' },
  { url: sneakerVibeUrl,  name: 'Sneaker Vibe' },
  { url: sneakersUrl,     name: 'Sneakers' },
  { url: sneakersSeenUrl, name: 'Sneakers Seen' },
  { url: scanSneakerUrl,  name: '3D Scan Sneaker' },
];

export const MODEL_NAMES = MODEL_SOURCES.map(m => m.name);
export const MODEL_COUNT = MODEL_SOURCES.length;

const templates = [];

function toStandardMaterial(m) {
  if (m.isMeshStandardMaterial) return m;
  const s = new THREE.MeshStandardMaterial();
  if (m.color) s.color.copy(m.color);
  if (m.map) s.map = m.map;
  if (m.normalMap) s.normalMap = m.normalMap;
  if (m.emissive) s.emissive.copy(m.emissive);
  if (m.emissiveMap) s.emissiveMap = m.emissiveMap;
  s.transparent = !!m.transparent;
  s.opacity = m.opacity ?? 1;
  s.side = m.side ?? THREE.FrontSide;
  s.roughness = 0.6;
  s.metalness = 0.05;
  if (!s.map && s.color.r + s.color.g + s.color.b < 0.15) {
    s.color.setRGB(0.82, 0.82, 0.82);
  }
  return s;
}

function normalizeMaterials(root) {
  const cache = new Map();
  root.traverse(child => {
    if (!child.isMesh || !child.material) return;
    const remap = (m) => {
      if (cache.has(m)) return cache.get(m);
      const next = toStandardMaterial(m);
      cache.set(m, next);
      return next;
    };
    child.material = Array.isArray(child.material)
      ? child.material.map(remap)
      : remap(child.material);
  });
}

let gltfLoader = null;

function getLoader(renderer) {
  if (gltfLoader) return gltfLoader;
  const ktx2 = new KTX2Loader()
    .setTranscoderPath('/basis/')
    .detectSupport(renderer);
  gltfLoader = new GLTFLoader()
    .setMeshoptDecoder(MeshoptDecoder)
    .setKTX2Loader(ktx2);
  return gltfLoader;
}

async function loadOne(src, renderer) {
  const gltf = await getLoader(renderer).loadAsync(src.url);
  return gltf.scene;
}

export async function loadShoeTemplate(renderer) {
  const loaded = await Promise.all(MODEL_SOURCES.map(s => loadOne(s, renderer)));
  loaded.forEach(root => {
    root.traverse(child => {
      if (child.isMesh) {
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
    templates.push(root);
  });
}

export function buildShoe(modelIndex = 0) {
  const template = templates[modelIndex % templates.length];
  const clone = template.clone(true);
  const group = new THREE.Group();
  group.add(clone);
  group.userData.modelIndex = modelIndex % templates.length;
  return group;
}
