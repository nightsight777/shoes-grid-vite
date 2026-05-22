// Slide-in right product detail panel
import { subscribe, setCartItems } from '../state/shopState.js';
import { CartService } from '../../application/services/CartService.js';
import { CartRepo } from '../../adapters/persistence/CartRepo.js';
import { AddToCart } from '../../application/useCases/AddToCart.js';
import { Shoe } from '../../domain/models/Shoe.js';
import { MODEL_NAMES, MODEL_COUNT } from '../../shoe.js';

const DEFAULT_PRICES = [12999, 9999, 18999, 15999, 7499, 11499, 10999, 8999, 13499, 11999];

// Singleton services (lazily initialized)
let cartService = null;
let cartRepository = null;
let addToCartUC = null;

function getServices() {
  if (!cartService) {
    cartService = new CartService();
    cartRepository = new CartRepo();
    addToCartUC = new AddToCart(cartService, cartRepository);
  }
  return { cartService, cartRepository, addToCartUC };
}

function buildShoeData(modelIndex) {
  const name = MODEL_NAMES[modelIndex % MODEL_COUNT] ?? `Shoe ${modelIndex}`;
  const price = DEFAULT_PRICES[modelIndex % DEFAULT_PRICES.length] ?? 9999;
  return {
    id: `shoe-${String(modelIndex).padStart(3, '0')}`,
    name,
    price,
    currency: 'USD',
    formattedPrice: `USD ${(price / 100).toFixed(2)}`,
    description: `Premium ${name} — engineered for comfort and style.`,
    modelIndex,
  };
}

export function openProductPanel(shoeGroup) {
  const modelIndex = shoeGroup.userData.modelIndex;
  const shoeData = buildShoeData(modelIndex);

  if (!panel) {
    panel = createPanel();
    document.body.appendChild(panel);
  }

  panel.querySelector('#pp-name').textContent = shoeData.name;
  panel.querySelector('#pp-price').textContent = shoeData.formattedPrice;
  panel.querySelector('#pp-desc').textContent = shoeData.description;
  panel.querySelector('#pp-model').textContent = `Model #${String(modelIndex + 1).padStart(2, '0')}`;
  panel.querySelector('#pp-qty').value = 1;
  panel.querySelector('#pp-add-btn').dataset.modelIndex = modelIndex;

  showPanel();
}

function showPanel() {
  panel.style.transform = 'translateX(0)';
  panel.style.opacity = '1';
  panel.style.pointerEvents = 'all';
}

function hidePanel() {
  panel.style.transform = 'translateX(110%)';
  panel.style.opacity = '0';
  panel.style.pointerEvents = 'none';
}

let panel = null;

function createPanel() {
  const el = document.createElement('div');
  el.id = 'product-panel';
  el.innerHTML = `
    <div class="pp-backdrop"></div>
    <div class="pp-drawer">
      <button class="pp-close" id="pp-close" aria-label="Close panel">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
      <div class="pp-header">
        <span class="pp-label">Product Detail</span>
        <h2 id="pp-name" class="pp-name">Nike Air</h2>
        <p id="pp-model" class="pp-model">Model #01</p>
      </div>
      <div class="pp-price-row">
        <span id="pp-price" class="pp-price">USD 129.99</span>
      </div>
      <p id="pp-desc" class="pp-desc">Premium shoe with advanced cushioning.</p>
      <div class="pp-sizes">
        <span class="pp-section-label">Select Size (US)</span>
        <div class="pp-size-grid" id="pp-sizes">
          <button class="pp-size-btn selected" data-size="7">7</button>
          <button class="pp-size-btn" data-size="8">8</button>
          <button class="pp-size-btn" data-size="9">9</button>
          <button class="pp-size-btn" data-size="10">10</button>
          <button class="pp-size-btn" data-size="11">11</button>
          <button class="pp-size-btn" data-size="12">12</button>
        </div>
      </div>
      <div class="pp-qty-row">
        <span class="pp-section-label">Quantity</span>
        <div class="pp-stepper">
          <button class="pp-step-btn" id="pp-dec">&#8722;</button>
          <input type="number" id="pp-qty" class="pp-qty-input" value="1" min="1" max="10" readonly />
          <button class="pp-step-btn" id="pp-inc">&#43;</button>
        </div>
      </div>
      <button class="pp-add-btn" id="pp-add-btn">Add to Cart</button>
    </div>
  `;

  // Close handlers
  el.querySelector('.pp-backdrop').addEventListener('click', hidePanel);
  el.querySelector('#pp-close').addEventListener('click', hidePanel);

  // Size selection
  el.querySelectorAll('.pp-size-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      el.querySelectorAll('.pp-size-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });

  // Quantity stepper
  el.querySelector('#pp-dec').addEventListener('click', () => {
    const input = el.querySelector('#pp-qty');
    input.value = Math.max(1, parseInt(input.value) - 1);
  });
  el.querySelector('#pp-inc').addEventListener('click', () => {
    const input = el.querySelector('#pp-qty');
    input.value = Math.min(10, parseInt(input.value) + 1);
  });

  // Add to cart button
  el.querySelector('#pp-add-btn').addEventListener('click', async (e) => {
    const modelIndex = parseInt(e.target.dataset.modelIndex);
    const qty = parseInt(el.querySelector('#pp-qty').value);
    const shoeData = buildShoeData(modelIndex);
    const shoe = new Shoe({ ...shoeData });
    const { addToCartUC: uc, cartRepository: repo } = getServices();
    const result = await uc.execute({ shoe, quantity: qty });
    if (result.success) {
      const items = await repo.getItems();
      setCartItems(items);
      hidePanel();
    }
  });

  // Escape key
  const escHandler = (ev) => { if (ev.key === 'Escape') hidePanel(); };
  document.addEventListener('keydown', escHandler);
  el._escHandler = escHandler;

  return el;
}