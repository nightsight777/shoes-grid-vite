// Domain model for a shoe product — no Three.js dependency
export interface ShoeAttributes {
  id: string;
  name: string;
  price: number; // in cents
  currency: string;
  imageUrl: string;
  modelIndex: number;
  description?: string;
}

export class Shoe {
  readonly id: string;
  readonly name: string;
  readonly price: number;
  readonly currency: string;
  readonly imageUrl: string;
  readonly modelIndex: number;
  readonly description: string;

  constructor(attrs: ShoeAttributes) {
    this.id = attrs.id;
    this.name = attrs.name;
    this.price = attrs.price;
    this.currency = attrs.currency ?? 'USD';
    this.imageUrl = attrs.imageUrl ?? '';
    this.modelIndex = attrs.modelIndex;
    this.description = attrs.description ?? '';
  }

  get formattedPrice(): string {
    return `${this.currency} ${(this.price / 100).toFixed(2)}`;
  }

  toPlain(): ShoeAttributes {
    return {
      id: this.id,
      name: this.name,
      price: this.price,
      currency: this.currency,
      imageUrl: this.imageUrl,
      modelIndex: this.modelIndex,
      description: this.description,
    };
  }
}