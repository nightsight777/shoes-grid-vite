import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

// Cloudinary URLs for all 3D shoe models
const CLOUD = 'https://res.cloudinary.com/dmr7zbqwv/raw/upload';

const MODEL_SOURCES = [
  { url: `${CLOUD}/v1779413060/shoes-grid-vite/uploads_files_4278121_Nike_Air_Shoes.glb`,       name: 'Nike Air' },
  { url: `${CLOUD}/v1779413061/shoes-grid-vite/uploads_files_4741956_shoe+exp.glb`,           name: 'Runner' },
  { url: `${CLOUD}/v1779413062/shoes-grid-vite/uploads_files_6167869_Boots.glb`,               name: 'Boots' },
  { url: `${CLOUD}/v1779413375/shoes-grid-vite/salomon_xt6_sneaker_photo_scan.glb`,           name: 'Salomon XT6' },
  { url: `${CLOUD}/v1779413062/shoes-grid-vite/vans_old_skool_navy.glb`,                      name: 'Vans Old Skool' },
  { url: `${CLOUD}/v1779413057/shoes-grid-vite/sneaker_b33.glb`,                              name: 'Sneaker B33' },
  { url: `${CLOUD}/v1779413058/shoes-grid-vite/sneaker_vibe.glb`,                             name: 'Sneaker Vibe' },
  { url: `${CLOUD}/v1779413059/shoes-grid-vite/sneakers.glb`,                                 name: 'Sneakers' },
  { url: `${CLOUD}/v1779413060/shoes-grid-vite/sneakers_seen.glb`,                           name: 'Sneakers Seen' },
  { url: `${CLOUD}/v1779413082/shoes-grid-vite/reserved_shoe_sneakers_3d_scan.glb`,           name: '3D Scan Sneaker' },
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