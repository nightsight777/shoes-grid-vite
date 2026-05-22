// Slide-in right cart drawer — shows items, qty steppers, checkout button
import { subscribe, setCartItems, openPage } from '../state/shopState.js';
import { CartService } from '../../application/services/CartService.js';
import { CartRepo } from '../../adapters/persistence/CartRepo.js';
import { RemoveFromCart } from '../../application/useCases/RemoveFromCart.js';

let cartService = null;
let cartRepository = null;
let removeFromCartUC = null;

function getServices() {
  if (!cartService) {
    cartService = new CartService();
    cartRepository = new CartRepo();
    removeFromCartUC = new RemoveFromCart(cartService, cartRepository);
  }
  return { cartService, cartRepository, removeFromCartUC };
}

let drawer = null;

export function openCartDrawer() {
  if (!drawer) {
    drawer = createDrawer();
    document.body.appendChild(drawer);
  }
  refreshDrawer();
  showDrawer();
}

function showDrawer() {
  drawer.style.transform = 'translateX(0)';
  drawer.style.opacity = '1';
  drawer.style.pointerEvents = 'all';
}

function hideDrawer() {
  drawer.style.transform = 'translateX(110%)';
  drawer.style.opacity = '0';
  drawer.style.pointerEvents = 'none';
}

async function refreshDrawer() {
  if (!drawer) return;
  const { cartRepository: repo } = getServices();
  const items = await repo.getItems();

  const list = drawer.querySelector('#cd-items');
  list.innerHTML = '';

  if (items.length === 0) {
    list.innerHTML = '<p class="cd-empty">Your cart is empty.</p>';
    drawer.querySelector('#cd-checkout-btn').disabled = true;
  } else {
    drawer.querySelector('#cd-checkout-btn').disabled = false;
    items.forEach(item => {
      const itemEl = document.createElement('div');
      itemEl.className = 'cd-item';
      itemEl.innerHTML = `
        <div class="cd-item-info">
          <span class="cd-item-name">${item.shoe.name}</span>
          <span class="cd-item-price">${item.shoe.formattedPrice}</span>
        </div>
        <div class="cd-item-controls">
          <button class="cd-qty-btn cd-dec" data-id="${item.id}">&#8722;</button>
          <span class="cd-qty">${item.quantity}</span>
          <button class="cd-qty-btn cd-inc" data-id="${item.id}">&#43;</button>
          <button class="cd-remove-btn" data-id="${item.id}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <polyline points="3,6 5,6 21,6"/><path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2v2"/>
            </svg>
          </button>
        </div>
      `;

      // Decrement
      itemEl.querySelector('.cd-dec').addEventListener('click', async () => {
        item.decrementQuantity();
        await repo.updateQuantity(item.id, item.quantity);
        refreshDrawer();
      });

      // Increment
      itemEl.querySelector('.cd-inc').addEventListener('click', async () => {
        item.incrementQuantity();
        await repo.updateQuantity(item.id, item.quantity);
        refreshDrawer();
      });

      // Remove
      itemEl.querySelector('.cd-remove-btn').addEventListener('click', async () => {
        await removeFromCartUC.execute({ cartItemId: item.id });
        const newItems = await cartRepository.getItems();
        setCartItems(newItems);
        refreshDrawer();
      });

      list.appendChild(itemEl);
    });
  }

  // Update total
  const total = items.reduce((s, i) => s + i.subtotal, 0);
  drawer.querySelector('#cd-total').textContent = `USD ${(total / 100).toFixed(2)}`;
}

function createDrawer() {
  const el = document.createElement('div');
  el.id = 'cart-drawer';
  el.innerHTML = `
    <div class="cd-backdrop"></div>
    <div class="cd-panel">
      <div class="cd-header">
        <span class="cd-label">Shopping Cart</span>
        <button class="cd-close" id="cd-close" aria-label="Close cart">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div id="cd-items" class="cd-items"></div>
      <div class="cd-footer">
        <div class="cd-total-row">
          <span class="cd-total-label">Total</span>
          <span id="cd-total" class="cd-total-amount">USD 0.00</span>
        </div>
        <button class="cd-checkout-btn" id="cd-checkout-btn" disabled>Proceed to Checkout</button>
      </div>
    </div>
  `;

  el.querySelector('.cd-backdrop').addEventListener('click', hideDrawer);
  el.querySelector('#cd-close').addEventListener('click', hideDrawer);

  el.querySelector('#cd-checkout-btn').addEventListener('click', () => {
    hideDrawer();
    openPage('checkout');
  });

  const escHandler = (ev) => { if (ev.key === 'Escape') hideDrawer(); };
  document.addEventListener('keydown', escHandler);
  el._escHandler = escHandler;

  return el;
}