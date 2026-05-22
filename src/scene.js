import * as THREE from 'three';

export function createRenderer(canvas) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true });
  r.setPixelRatio(Math.min(devicePixelRatio, 2));
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.15;
  return r;
}

export function createCamera(aspect) {
  const cam = new THREE.PerspectiveCamera(50, aspect, 0.1, 300);
  cam.position.set(0, 4.6, 14);
  cam.lookAt(0, 4.6, 0);
  return cam;
}

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf8f8f8);
  return scene;
}

export function createLights(scene) {
  const ambient = new THREE.AmbientLight(0xffffff, 1.4);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfff8f2, 1.8);
  sun.position.set(5, 18, 16);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { near: 1, far: 100, left: -18, right: 18, top: 18, bottom: -18 });
  scene.add(sun);

  const fill = new THREE.DirectionalLight(0xcce4ff, 0.65);
  fill.position.set(-8, 10, 12);
  scene.add(fill);

  const rim = new THREE.PointLight(0xff44aa, 0.55, 90);
  rim.position.set(0, 10, 0);
  scene.add(rim);

  return { ambient, sun, fill, rim };
}
