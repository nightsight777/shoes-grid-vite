// Cart icon with badge — rendered inside the nav
import { on, getCartCount } from '../state/shopState.js';
import { openCartDrawer } from './CartDrawer.js';

let badge = null;

function updateBadge(count) {
  if (!badge) return;
  badge.textContent = count;
  badge.style.opacity = count > 0 ? '1' : '0';
}

export function initNavCartIcon(nav) {
  // Create cart icon button in nav
  const cartBtn = document.createElement('button');
  cartBtn.className = 'nav-cart-btn';
  cartBtn.setAttribute('aria-label', 'Open cart');
  cartBtn.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 01-8 0"/>
    </svg>
    <span class="nav-cart-badge" id="cart-badge">0</span>
  `;
  badge = cartBtn.querySelector('#cart-badge');
  cartBtn.addEventListener('click', openCartDrawer);
  nav.appendChild(cartBtn);

  // Subscribe to state
  on(({ cartCount }) => updateBadge(cartCount));
  updateBadge(getCartCount());
}