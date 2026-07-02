import { Injectable } from '@nestjs/common';

@Injectable()
export class UnitsService {
  private readonly localUnits = new Map<string, any>([
    ['PCS', { id: 'PCS', name: 'Pieces', abbreviation: 'PCS', decimals: 0 }],
    ['BOX', { id: 'BOX', name: 'Box', abbreviation: 'BOX', decimals: 0 }],
    ['PACK', { id: 'PACK', name: 'Pack', abbreviation: 'PACK', decimals: 0 }],
    ['DOZEN', { id: 'DOZEN', name: 'Dozen', abbreviation: 'DOZEN', decimals: 0 }],
    ['KG', { id: 'KG', name: 'Kilogram', abbreviation: 'KG', decimals: 2 }],
    ['GRAM', { id: 'GRAM', name: 'Gram', abbreviation: 'GRAM', decimals: 2 }],
    ['TON', { id: 'TON', name: 'Ton', abbreviation: 'TON', decimals: 2 }],
    ['LTR', { id: 'LTR', name: 'Liter', abbreviation: 'LTR', decimals: 2 }],
    ['ML', { id: 'ML', name: 'Milliliter', abbreviation: 'ML', decimals: 2 }],
    ['METER', { id: 'METER', name: 'Meter', abbreviation: 'METER', decimals: 2 }],
    ['FEET', { id: 'FEET', name: 'Feet', abbreviation: 'FEET', decimals: 2 }],
    ['SQFT', { id: 'SQFT', name: 'Square Feet', abbreviation: 'SQFT', decimals: 2 }],
    ['CFT', { id: 'CFT', name: 'Cubic Feet', abbreviation: 'CFT', decimals: 2 }],
    ['ROLL', { id: 'ROLL', name: 'Roll', abbreviation: 'ROLL', decimals: 2 }],
    ['BAG', { id: 'BAG', name: 'Bag', abbreviation: 'BAG', decimals: 2 }],
  ]);

  async findAll() {
    return Array.from(this.localUnits.values());
  }

  async create(name: string, abbreviation: string, decimals: number) {
    const symbol = abbreviation.toUpperCase();
    const unit = { id: symbol, name, abbreviation: symbol, decimals };
    this.localUnits.set(symbol, unit);
    return unit;
  }
}
