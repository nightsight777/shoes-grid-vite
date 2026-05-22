// Use case: remove a shoe from the cart
import { CartRepository } from '../domain/ports/CartRepository.js';
import { CartService } from '../services/CartService.js';

export interface RemoveFromCartInput {
  cartItemId: string;
}

export interface RemoveFromCartResult {
  success: boolean;
  error?: string;
}

export class RemoveFromCart {
  constructor(
    private cartService: CartService,
    private cartRepository: CartRepository
  ) {}

  async execute(input: RemoveFromCartInput): Promise<RemoveFromCartResult> {
    try {
      await this.cartService.removeFromCart(input.cartItemId);
      await this.cartRepository.removeItem(input.cartItemId);
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  }
}