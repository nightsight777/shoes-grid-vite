// Port interface for shoe catalog repository
import { Shoe } from '../models/Shoe.js';

export interface ShoeRepository {
  /**
   * Returns all available shoes in the catalog.
   */
  findAll(): Promise<Shoe[]>;

  /**
   * Finds a shoe by its unique id.
   */
  findById(id: string): Promise<Shoe | null>;

  /**
   * Finds shoes matching a given model index.
   */
  findByModelIndex(modelIndex: number): Promise<Shoe[]>;
}