// Application service: cart operations (business logic)
import { CartItem } from '../../domain/models/CartItem.js';
import { Shoe } from '../../domain/models/Shoe.js';
import { Order } from '../../domain/models/Order.js';

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export class CartService {
  private cart: Map<string, CartItem> = new Map();

  async addToCart(shoe: Shoe, quantity = 1): Promise<CartItem> {
    // Find existing cart item for this shoe
    let existing: CartItem | undefined;
    for (const item of this.cart.values()) {
      if (item.shoe.id === shoe.id) {
        existing = item;
        break;
      }
    }

    if (existing) {
      existing.incrementQuantity(quantity);
      return existing;
    }

    const cartItem = new CartItem({
      id: generateId(),
      shoe,
      quantity,
    });
    this.cart.set(cartItem.id, cartItem);
    return cartItem;
  }

  async removeFromCart(cartItemId: string): Promise<void> {
    if (!this.cart.has(cartItemId)) {
      throw new Error(`Cart item not found: ${cartItemId}`);
    }
    this.cart.delete(cartItemId);
  }

  async getCartItems(): Promise<CartItem[]> {
    return Array.from(this.cart.values());
  }

  async getCartTotal(): Promise<number> {
    return Array.from(this.cart.values()).reduce((sum, item) => sum + item.subtotal, 0);
  }

  async checkout(cartItems: CartItem[], shippingAddress: string): Promise<Order> {
    if (cartItems.length === 0) {
      throw new Error('Cannot checkout with empty cart');
    }

    const total = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
    const firstShoe = cartItems[0].shoe;

    const order = new Order({
      id: generateId(),
      items: cartItems,
      totalAmount: total,
      currency: firstShoe.currency,
      status: 'confirmed',
      createdAt: new Date(),
      shippingAddress,
    });

    return order;
  }
}