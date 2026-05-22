// Full-page checkout with shipping + payment form
import { subscribe, setCurrentOrder, openPage } from '../state/shopState.js';
import { openCartDrawer } from '../components/CartDrawer.js';
import { CartService } from '../../application/services/CartService.js';
import { CatalogService } from '../../application/services/CatalogService.js';
import { CartRepo } from '../../adapters/persistence/CartRepo.js';
import { Checkout } from '../../application/useCases/Checkout.js';

let cartService = null;
let catalogService = null;
let cartRepository = null;
let checkoutUC = null;

function getServices() {
  if (!cartService) {
    cartService = new CartService();
    catalogService = new CatalogService(null);
    cartRepository = new CartRepo();
    checkoutUC = new Checkout(cartService, catalogService, cartRepository);
  }
  return { cartService, catalogService, cartRepository, checkoutUC };
}

export function renderCheckoutPage() {
  const page = document.getElementById('page-checkout');
  if (!page) return;

  // Inject page shell if empty
  if (!page.querySelector('.co-page')) {
    page.innerHTML = `
      <div class="co-page">
        <div class="co-page-inner">
          <div class="co-page-header">
            <button class="co-page-back" id="co-page-back" aria-label="Back to cart">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <h1 class="co-page-title">Checkout</h1>
          </div>
          <div class="co-summary-bar">
            <span id="co-item-count">0 items</span>
            <span class="co-summary-total">
              Total: <strong id="co-total">USD 0.00</strong>
            </span>
          </div>
          <div id="co-form" class="co-form"></div>
        </div>
      </div>
    `;
    page.querySelector('#co-page-back').addEventListener('click', () => openCartDrawer());
  }

  const { cartRepository: repo } = getServices();

  repo.getItems().then(async items => {
    const total = items.reduce((s, i) => s + i.subtotal, 0);
    page.querySelector('#co-item-count').textContent = `${items.length} item${items.length !== 1 ? 's' : ''}`;
    page.querySelector('#co-total').textContent = `USD ${(total / 100).toFixed(2)}`;

    if (items.length === 0) {
      page.querySelector('#co-form').innerHTML = `
        <div class="co-empty">
          <p>Your cart is empty.</p>
          <button class="co-continue-btn" onclick="window.shopOpenCollection()">Back to Collection</button>
        </div>
      `;
      return;
    }

    page.querySelector('#co-form').innerHTML = `
      <div class="co-grid">
        <div class="co-section">
          <h3 class="co-section-title">Shipping Information</h3>
          <div class="co-field">
            <label for="co-name">Full Name</label>
            <input type="text" id="co-name" placeholder="Jane Smith" required />
          </div>
          <div class="co-field">
            <label for="co-email">Email</label>
            <input type="email" id="co-email" placeholder="jane@example.com" required />
          </div>
          <div class="co-field">
            <label for="co-address">Street Address</label>
            <input type="text" id="co-address" placeholder="123 Main St" required />
          </div>
          <div class="co-field-row">
            <div class="co-field">
              <label for="co-city">City</label>
              <input type="text" id="co-city" placeholder="New York" required />
            </div>
            <div class="co-field">
              <label for="co-state">State</label>
              <input type="text" id="co-state" placeholder="NY" required />
            </div>
            <div class="co-field">
              <label for="co-zip">ZIP</label>
              <input type="text" id="co-zip" placeholder="10001" required />
            </div>
          </div>
        </div>
        <div class="co-section">
          <h3 class="co-section-title">Payment Details</h3>
          <div class="co-field">
            <label for="co-card">Card Number</label>
            <input type="text" id="co-card" placeholder="4111 1111 1111 1111" maxlength="19" required />
          </div>
          <div class="co-field-row">
            <div class="co-field">
              <label for="co-exp">Expiry</label>
              <input type="text" id="co-exp" placeholder="MM/YY" maxlength="5" required />
            </div>
            <div class="co-field">
              <label for="co-cvv">CVV</label>
              <input type="text" id="co-cvv" placeholder="123" maxlength="4" required />
            </div>
          </div>
          <div class="co-field">
            <label for="co-name-on-card">Name on Card</label>
            <input type="text" id="co-name-on-card" placeholder="JANE SMITH" required />
          </div>
        </div>
      </div>
      <div class="co-submit-row">
        <button class="co-back-btn" id="co-back-btn">&#8592; Back to Cart</button>
        <button class="co-place-btn" id="co-place-btn">Place Order &mdash; <span id="co-total">USD 0.00</span></button>
      </div>
    `;

    // Back button
    page.querySelector('#co-back-btn').addEventListener('click', () => {
      import('../components/CartDrawer.js').then(m => m.openCartDrawer());
    });

    // Place order
    page.querySelector('#co-place-btn').addEventListener('click', async () => {
      const name = page.querySelector('#co-name')?.value;
      const email = page.querySelector('#co-email')?.value;
      const address = page.querySelector('#co-address')?.value;
      const city = page.querySelector('#co-city')?.value;
      const state = page.querySelector('#co-state')?.value;
      const zip = page.querySelector('#co-zip')?.value;

      if (!name || !email || !address || !city || !state || !zip) {
        alert('Please fill in all shipping fields.');
        return;
      }

      const shippingAddress = `${name}, ${address}, ${city}, ${state} ${zip}`;
      const { checkoutUC: uc } = getServices();
      const result = await uc.execute({ shippingAddress });

      if (result.success && result.order) {
        setCurrentOrder(result.order);
        openPage('confirmation');
      } else {
        alert('Checkout failed: ' + (result.error ?? 'Unknown error'));
      }
    });

    // Update total in button
    page.querySelector('#co-place-btn').querySelector('span').textContent = `USD ${(total / 100).toFixed(2)}`;
  });
}