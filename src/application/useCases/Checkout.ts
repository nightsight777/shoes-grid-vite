// Use case: checkout — convert cart to an order
import { Order } from '../../domain/models/Order.js';
import { CartRepository } from '../domain/ports/CartRepository.js';
import { CartService } from '../services/CartService.js';
import { CatalogService } from '../services/CatalogService.js';

export interface CheckoutInput {
  shippingAddress?: string;
}

export interface CheckoutResult {
  success: boolean;
  order?: Order;
  error?: string;
}

export class Checkout {
  constructor(
    private cartService: CartService,
    private catalogService: CatalogService,
    private cartRepository: CartRepository
  ) {}

  async execute(input: CheckoutInput): Promise<CheckoutResult> {
    try {
      const cartItems = await this.cartRepository.getItems();
      if (cartItems.length === 0) {
        return { success: false, error: 'Cart is empty' };
      }

      const order = await this.cartService.checkout(cartItems, input.shippingAddress ?? '');
      await this.cartRepository.clear();
      return { success: true, order };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  }
}