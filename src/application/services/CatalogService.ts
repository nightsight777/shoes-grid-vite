// Application service: catalog operations (product listing)
import { Shoe } from '../../domain/models/Shoe.js';
import { ShoeRepository } from '../domain/ports/ShoeRepository.js';
import { MODEL_NAMES, MODEL_COUNT } from '../../shoe.js';

// Maps Three.js model indices to domain Shoe entities
// NOTE: MODEL_NAMES / MODEL_COUNT come from shoe.js (Three.js side)
// We bridge the 3D rendering world to the domain world here.

function buildShoeFromModelIndex(modelIndex: number): Shoe {
  const id = `shoe-${String(modelIndex).padStart(3, '0')}`;
  const name = MODEL_NAMES[modelIndex % MODEL_COUNT] ?? `Shoe ${modelIndex}`;

  // Default prices for demo — in a real app these come from a database
  const defaultPrices: Record<number, number> = {
    0: 12999,  // Nike Air
    1: 9999,   // Runner
    2: 18999,  // Boots
    3: 15999,  // Salomon XT6
    4: 7499,   // Vans Old Skool
    5: 11499,  // Sneaker B33
    6: 10999,  // Sneaker Vibe
    7: 8999,   // Sneakers
    8: 13499,  // Sneakers Seen
    9: 11999,  // 3D Scan Sneaker
  };

  return new Shoe({
    id,
    name,
    price: defaultPrices[modelIndex % MODEL_COUNT] ?? 9999,
    currency: 'USD',
    imageUrl: `/assets/shoes-optimized/${id}.png`,
    modelIndex,
    description: `Premium ${name} — available in multiple colorways.`,
  });
}

export class CatalogService {
  constructor(private shoeRepository: ShoeRepository) {}

  async getAllShoes(): Promise<Shoe[]> {
    const shoes: Shoe[] = [];
    for (let i = 0; i < MODEL_COUNT; i++) {
      shoes.push(buildShoeFromModelIndex(i));
    }
    return shoes;
  }

  async getShoeById(id: string): Promise<Shoe | null> {
    // id format: shoe-XXX
    const match = id.match(/^shoe-(\d+)$/);
    if (!match) return null;
    const idx = parseInt(match[1], 10);
    if (isNaN(idx) || idx < 0 || idx >= MODEL_COUNT) return null;
    return buildShoeFromModelIndex(idx);
  }

  async getShoesByModelIndex(modelIndex: number): Promise<Shoe[]> {
    if (modelIndex < 0 || modelIndex >= MODEL_COUNT) return [];
    return [buildShoeFromModelIndex(modelIndex)];
  }
}