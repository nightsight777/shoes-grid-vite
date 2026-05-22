// Use case: add a shoe to the cart
import { CartItem } from '../../domain/models/CartItem.js';
import { Shoe } from '../../domain/models/Shoe.js';
import { CartRepository } from '../domain/ports/CartRepository.js';
import { CartService } from '../services/CartService.js';

export interface AddToCartInput {
  shoe: Shoe;
  quantity?: number;
}

export interface AddToCartResult {
  success: boolean;
  cartItem: CartItem;
  error?: string;
}

export class AddToCart {
  constructor(
    private cartService: CartService,
    private cartRepository: CartRepository
  ) {}

  async execute(input: AddToCartInput): Promise<AddToCartResult> {
    try {
      const qty = input.quantity ?? 1;
      const cartItem = await this.cartService.addToCart(input.shoe, qty);
      await this.cartRepository.addItem(cartItem);
      return { success: true, cartItem };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, cartItem: null as unknown as CartItem, error: message };
    }
  }
}