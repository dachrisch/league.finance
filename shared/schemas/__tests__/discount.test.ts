import { describe, it, expect } from 'vitest';
import { AddDiscountSchema } from '../discount';

describe('AddDiscountSchema', () => {
  it('should allow FIXED discount with any value', () => {
    const result = AddDiscountSchema.safeParse({
      configId: '123',
      type: 'FIXED',
      value: 200,
      description: 'Large fixed',
    });
    expect(result.success).toBe(true);
  });

  it('should reject PERCENT discount with value > 100', () => {
    const result = AddDiscountSchema.safeParse({
      configId: '123',
      type: 'PERCENT',
      value: 150,
      description: 'Invalid percent',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['value']);
  });

  it('should allow PERCENT discount with value <= 100', () => {
    const result = AddDiscountSchema.safeParse({
      configId: '123',
      type: 'PERCENT',
      value: 50,
      description: 'Valid percent',
    });
    expect(result.success).toBe(true);
  });

  it('should allow PERCENT discount with value = 100 (exact boundary)', () => {
    const result = AddDiscountSchema.safeParse({
      configId: '123',
      type: 'PERCENT',
      value: 100,
      description: 'Max percent',
    });
    expect(result.success).toBe(true);
  });

  it('should reject discount with value = 0 (not positive)', () => {
    const result = AddDiscountSchema.safeParse({
      configId: '123',
      type: 'PERCENT',
      value: 0,
      description: 'Zero discount',
    });
    expect(result.success).toBe(false);
  });
});
