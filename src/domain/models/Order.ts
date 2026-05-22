// Domain model for a completed order
import { CartItem } from './CartItem.js';

export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

export interface OrderAttributes {
  id: string;
  items: CartItem[];
  totalAmount: number;
  currency: string;
  status: OrderStatus;
  createdAt: Date;
  shippingAddress?: string;
}

export class Order {
  readonly id: string;
  readonly items: CartItem[];
  readonly totalAmount: number;
  readonly currency: string;
  readonly status: OrderStatus;
  readonly createdAt: Date;
  readonly shippingAddress: string;

  constructor(attrs: OrderAttributes) {
    this.id = attrs.id;
    this.items = attrs.items;
    this.totalAmount = attrs.totalAmount;
    this.currency = attrs.currency ?? 'USD';
    this.status = attrs.status ?? 'pending';
    this.createdAt = attrs.createdAt ?? new Date();
    this.shippingAddress = attrs.shippingAddress ?? '';
  }

  get formattedTotal(): string {
    return `${this.currency} ${(this.totalAmount / 100).toFixed(2)}`;
  }

  get itemCount(): number {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  toPlain(): OrderAttributes {
    return {
      id: this.id,
      items: this.items,
      totalAmount: this.totalAmount,
      currency: this.currency,
      status: this.status,
      createdAt: this.createdAt,
      shippingAddress: this.shippingAddress,
    };
  }
}