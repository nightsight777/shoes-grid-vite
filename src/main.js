import * as THREE from 'three';
import './style.css';
import { createRenderer, createCamera, createScene, createLights } from './scene.js';
import { loadShoeTemplate, buildShoe, MODEL_NAMES, MODEL_COUNT } from './shoe.js';
import { initNavCartIcon } from './ui/components/NavCartIcon.js';
import { openProductPanel } from './ui/components/ProductPanel.js';
import { openCartDrawer } from './ui/components/CartDrawer.js';
import { renderCheckoutPage } from './ui/pages/CheckoutPage.js';
import { renderConfirmationPage } from './ui/pages/ConfirmationPage.js';
import { openPage, subscribe } from './ui/state/shopState.js';

const ROWS = 5;
const COLS = 6;
const SPACING_X = 1.85;
const SPACING_Y = 1.85;
const WALL_Z = 0;

const container = document.getElementById('canvas-container');
const canvas = document.createElement('canvas');
container.appendChild(canvas);

const renderer = createRenderer(canvas);
const scene = createScene();
const camera = createCamera(container.clientWidth / container.clientHeight);
const lights = createLights(scene);

const OV_POS = new THREE.Vector3(0, 4.6, 14);
const OV_LOOK = new THREE.Vector3(0, 4.6, 0);

const camPos = OV_POS.clone();
const camLook = OV_LOOK.clone();
const tgtPos = OV_POS.clone();
const tgtLook = OV_LOOK.clone();
let zoomedShoe = null;

const ZOOM_DISTANCE = 1.45;
const ZOOM_MIN = 0.7;
const ZOOM_MAX = 3.2;
const ROT_X_LIMIT = 1.1;

const inspect = {
  rotY: Math.PI,
  rotX: 0,
  dist: ZOOM_DISTANCE,
  dragging: false,
  lastX: 0,
  lastY: 0,
  moved: false,
};

const DEFAULT_PRICES = [129.99, 99.99, 189.99, 159.99, 74.99, 114.99, 109.99, 89.99, 134.99, 119.99];

function zoomTo(shoe) {
  const p = shoe.position;
  inspect.rotY = Math.PI;
  inspect.rotX = 0;
  inspect.dist = ZOOM_DISTANCE;
  tgtPos.set(p.x, p.y, p.z + inspect.dist);
  tgtLook.set(p.x, p.y, p.z);
  zoomedShoe = shoe;

  const ui = document.getElementById('zoom-ui');
  ui.classList.remove('hidden');
  const idx = shoe.userData.modelIndex;
  const COLORWAYS = ['Triple White','Solar Red','Desert Tan','Storm Grey','Navy/White','Ocean Blue','Forest Green','Cloud White','Ink Black','Lunar Grey'];
  document.getElementById('zoom-name').textContent = MODEL_NAMES[idx];
  document.getElementById('zoom-color').textContent = COLORWAYS[idx];
  document.getElementById('zoom-price').textContent = `USD ${DEFAULT_PRICES[idx].toFixed(2)}`;
}

function zoomOut() {
  tgtPos.copy(OV_POS);
  tgtLook.copy(OV_LOOK);
  zoomedShoe = null;
  inspect.dragging = false;
  canvas.style.cursor = 'default';
  document.getElementById('zoom-ui').classList.add('hidden');
}

const shoeGroups = [];
const shoeMeshes = [];

const clock = new THREE.Clock();
let elapsed = 0;
let hoveredGroup = null;

renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 0.05);
  elapsed += delta;
  const t = elapsed;

  if (zoomedShoe) {
    const p = zoomedShoe.position;
    tgtPos.set(p.x, p.y, p.z + inspect.dist);
    tgtLook.set(p.x, p.y, p.z);
  }

  const speed = zoomedShoe ? 0.09 : 0.07;
  camPos.lerp(tgtPos, speed);
  camLook.lerp(tgtLook, speed);
  camera.position.copy(camPos);
  camera.lookAt(camLook);

  shoeGroups.forEach(shoe => {
    const isHovered = !zoomedShoe && shoe === hoveredGroup;
    const isZoomed = shoe === zoomedShoe;

    if (isZoomed) {
      shoe.rotation.y = inspect.rotY;
      shoe.rotation.x = inspect.rotX;
    } else {
      shoe.rotation.x = 0;
      shoe.rotation.y = Math.PI + Math.sin(t * 0.28 + shoe.userData.phase) * 0.13;
    }

    const floatZ = isZoomed ? 0 : Math.sin(t * 0.65 + shoe.userData.phase) * 0.030;
    const liftZ = isHovered ? 0.14 : 0;
    const targetZ = shoe.userData.baseZ + floatZ + liftZ;
    shoe.position.z += (targetZ - shoe.position.z) * 0.13;

    const targetS = isHovered ? 1.10 : 1.0;
    shoe.scale.setScalar(shoe.scale.x + (targetS - shoe.scale.x) * 0.12);
  });

  lights.rim.intensity = 0.42 + Math.sin(t * 0.36) * 0.26;
  lights.rim.color.setHSL((t * 0.032) % 1, 0.82, 0.58);
  lights.rim.position.set(Math.cos(t * 0.13) * 15, 10, Math.sin(t * 0.13) * 15);

  renderer.render(scene, camera);
});

function onResize() {
  const w = container.clientWidth;
  const h = container.clientHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', onResize);
onResize();

const raycaster = new THREE.Raycaster();
const ptr = new THREE.Vector2();

function updatePointer(e) {
  const r = canvas.getBoundingClientRect();
  ptr.x = ((e.clientX - r.left) / r.width) * 2 - 1;
  ptr.y = -((e.clientY - r.top) / r.height) * 2 + 1;
}

function hitShoe() {
  raycaster.setFromCamera(ptr, camera);
  const hits = raycaster.intersectObjects(shoeMeshes, false);
  return hits.length ? (hits[0].object.userData.parentGroup ?? null) : null;
}

canvas.addEventListener('mousemove', e => {
  if (zoomedShoe) {
    if (inspect.dragging) {
      const dx = e.clientX - inspect.lastX;
      const dy = e.clientY - inspect.lastY;
      inspect.lastX = e.clientX;
      inspect.lastY = e.clientY;
      if (Math.abs(dx) + Math.abs(dy) > 2) inspect.moved = true;
      inspect.rotY += dx * 0.0085;
      inspect.rotX = Math.max(-ROT_X_LIMIT, Math.min(ROT_X_LIMIT, inspect.rotX + dy * 0.0085));
      canvas.style.cursor = 'grabbing';
    } else {
      canvas.style.cursor = 'grab';
    }
    return;
  }
  updatePointer(e);
  hoveredGroup = hitShoe();
  canvas.style.cursor = hoveredGroup ? 'pointer' : 'default';
});

canvas.addEventListener('mouseleave', () => {
  hoveredGroup = null;
  inspect.dragging = false;
  canvas.style.cursor = 'default';
});

canvas.addEventListener('mousedown', e => {
  if (!zoomedShoe) return;
  inspect.dragging = true;
  inspect.moved = false;
  inspect.lastX = e.clientX;
  inspect.lastY = e.clientY;
  canvas.style.cursor = 'grabbing';
});

window.addEventListener('mouseup', () => {
  inspect.dragging = false;
  if (zoomedShoe) canvas.style.cursor = 'grab';
});

canvas.addEventListener('wheel', e => {
  if (!zoomedShoe) return;
  e.preventDefault();
  const factor = Math.exp(e.deltaY * 0.0012);
  inspect.dist = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, inspect.dist * factor));
}, { passive: false });

canvas.addEventListener('click', e => {
  if (zoomedShoe) {
    if (!inspect.moved) zoomOut();
    return;
  }
  updatePointer(e);
  const hit = hitShoe();
  if (hit) zoomTo(hit);
});

document.getElementById('zoom-back').addEventListener('click', zoomOut);
document.addEventListener('keydown', e => { if (e.key === 'Escape') zoomOut(); });

// ── Product panel integration ────────────────────────────────────────────────
// Open product panel when zoom-cart button is clicked
document.getElementById('zoom-cart-btn').addEventListener('click', () => {
  if (zoomedShoe) openProductPanel(zoomedShoe);
});

// ── Navigation cart icon ─────────────────────────────────────────────────────
const nav = document.getElementById('navbar');
initNavCartIcon(nav ? nav.querySelector('.nav-inner') || nav : null);

// ── Page routing ─────────────────────────────────────────────────────────────
function renderActivePage(name) {
  if (name === 'checkout') renderCheckoutPage();
  if (name === 'confirmation') renderConfirmationPage();
}

// Route changes to render page content
let lastPage = 'home';
subscribe(({ cartItems, cartCount, currentOrder }) => {
  const currentPage = document.querySelector('.app-page.active')?.id?.replace('page-', '') ?? 'home';
  if (currentPage !== lastPage) {
    lastPage = currentPage;
    renderActivePage(currentPage);
  }
});

// Expose openCartDrawer globally for HTML buttons
window.shopOpenCart = openCartDrawer;
window.shopOpenCollection = () => openPage('home');

// Back from checkout page
document.addEventListener('click', e => {
  if (e.target.id === 'co-page-back' || e.target.closest('#co-page-back')) {
    openCartDrawer();
  }
});

// Wire zoom Add to Cart → open product panel (size/qty selection, then add to cart)
document.getElementById('zoom-add-cart').addEventListener('click', () => {
  if (zoomedShoe) openProductPanel(zoomedShoe);
});

// ── 3D Grid ──────────────────────────────────────────────────────────────────
async function init() {
  await loadShoeTemplate(renderer);

  const offsetX = ((COLS - 1) * SPACING_X) / 2;
  const offsetY = ((ROWS - 1) * SPACING_Y) / 2;

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const gx = col * SPACING_X - offsetX;
      const gy = row * SPACING_Y - offsetY + 4.6;

      const cellIndex = row * COLS + col;
      const modelIndex = cellIndex % MODEL_COUNT;
      const shoe = buildShoe(modelIndex);
      shoe.rotation.y = Math.PI;
      const shoeY = gy + 0.09;
      shoe.position.set(gx, shoeY, WALL_Z);
      shoe.userData = {
        shoeIndex: cellIndex,
        modelIndex,
        phase: Math.random() * Math.PI * 2,
        baseY: shoeY,
        baseZ: WALL_Z,
      };

      shoe.traverse(child => {
        if (child.isMesh) {
          child.userData.parentGroup = shoe;
          shoeMeshes.push(child);
        }
      });

      scene.add(shoe);
      shoeGroups.push(shoe);
    }
  }
}

init();