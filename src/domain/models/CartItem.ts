// Domain model for a cart line item
import { Shoe } from './Shoe.js';

export interface CartItemAttributes {
  id: string;
  shoe: Shoe;
  quantity: number;
}

export class CartItem {
  readonly id: string;
  readonly shoe: Shoe;
  private _quantity: number;

  constructor(attrs: CartItemAttributes) {
    this.id = attrs.id;
    this.shoe = attrs.shoe;
    this._quantity = attrs.quantity ?? 1;
  }

  get quantity(): number {
    return this._quantity;
  }

  get subtotal(): number {
    return this.shoe.price * this._quantity;
  }

  get formattedSubtotal(): string {
    return `${this.shoe.currency} ${(this.subtotal / 100).toFixed(2)}`;
  }

  incrementQuantity(amount = 1): void {
    this._quantity += amount;
  }

  decrementQuantity(amount = 1): void {
    this._quantity = Math.max(1, this._quantity - amount);
  }

  toPlain(): CartItemAttributes {
    return {
      id: this.id,
      shoe: this.shoe,
      quantity: this._quantity,
    };
  }
}