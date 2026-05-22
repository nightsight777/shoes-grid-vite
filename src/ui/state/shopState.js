// Simple reactive shop state — single source of truth for cart & UI state
const listeners = new Set();

let _cartItems = [];
let _cartCount = 0;
let _currentOrder = null;

export function getCartItems() { return _cartItems; }
export function getCartCount() { return _cartCount; }
export function getCurrentOrder() { return _currentOrder; }

function recompute() {
  _cartCount = _cartItems.reduce((s, i) => s + i.quantity, 0);
}

export function setCartItems(items) {
  _cartItems = items;
  recompute();
  notify();
}

export function setCurrentOrder(order) {
  _currentOrder = order;
  notify();
}

export function subscribe(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function notify() {
  for (const cb of listeners) cb({ cartItems: _cartItems, cartCount: _cartCount, currentOrder: _currentOrder });
}

export function on(cb) { return subscribe(cb); }
export function openPage(name) {
  document.querySelectorAll('.app-page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById(`page-${name}`);
  if (page) page.classList.add('active');
}