// Use case: retrieve all products from the catalog
import { Shoe } from '../../domain/models/Shoe.js';
import { ShoeRepository } from '../domain/ports/ShoeRepository.js';

export interface GetProductsResult {
  shoes: Shoe[];
  total: number;
}

export class GetProducts {
  constructor(private shoeRepository: ShoeRepository) {}

  async execute(): Promise<GetProductsResult> {
    const shoes = await this.shoeRepository.findAll();
    return { shoes, total: shoes.length };
  }
}