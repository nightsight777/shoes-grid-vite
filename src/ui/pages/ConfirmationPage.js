// Order confirmation page — shown after successful checkout
import { subscribe, getCurrentOrder } from '../state/shopState.js';
import { openPage } from '../state/shopState.js';

export function renderConfirmationPage() {
  const page = document.getElementById('page-confirmation');
  if (!page) return;

  const order = getCurrentOrder();

  if (!order) {
    page.querySelector('#cf-order-id').textContent = 'ORD-??????';
    page.querySelector('#cf-message').textContent = 'No order found.';
    page.querySelector('#cf-items').innerHTML = '';
    page.querySelector('#cf-total').textContent = 'USD 0.00';
  } else {
    page.querySelector('#cf-order-id').textContent = `ORD-${order.id.slice(-6).toUpperCase()}`;
    page.querySelector('#cf-message').textContent = 'Thank you for your purchase!';
    page.querySelector('#cf-email-note').textContent =
      'A confirmation has been sent to your email.';

    // Render items
    const itemsEl = page.querySelector('#cf-items');
    itemsEl.innerHTML = '';
    order.items.forEach(item => {
      const el = document.createElement('div');
      el.className = 'cf-item';
      el.innerHTML = `
        <span class="cf-item-name">${item.shoe.name}</span>
        <span class="cf-item-qty">x${item.quantity}</span>
        <span class="cf-item-sub">${item.formattedSubtotal}</span>
      `;
      itemsEl.appendChild(el);
    });

    page.querySelector('#cf-total').textContent = order.formattedTotal;
    page.querySelector('#cf-address').textContent = order.shippingAddress || 'N/A';
  }

  // Continue shopping button
  const continueBtn = page.querySelector('#cf-continue-btn');
  if (continueBtn) {
    continueBtn.addEventListener('click', () => {
      openPage('home');
    });
  }
}