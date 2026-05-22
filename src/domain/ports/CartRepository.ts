// Port interface for cart persistence
import { CartItem } from '../models/CartItem.js';

export interface CartRepository {
  /**
   * Returns all items currently in the cart.
   */
  getItems(): Promise<CartItem[]>;

  /**
   * Adds an item to the cart (or increments qty if already present).
   */
  addItem(item: CartItem): Promise<void>;

  /**
   * Removes an item completely from the cart by id.
   */
  removeItem(cartItemId: string): Promise<void>;

  /**
   * Updates the quantity of an existing cart item.
   */
  updateQuantity(cartItemId: string, quantity: number): Promise<void>;

  /**
   * Clears all items from the cart.
   */
  clear(): Promise<void>;
}