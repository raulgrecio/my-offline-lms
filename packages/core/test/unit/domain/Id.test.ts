import { describe, it, expect } from 'vitest';
import { generateId } from '@core/domain';

describe('Id Generator', () => {
  it('should generate a string ID', () => {
    const id = generateId();
    expect(typeof id).toBe('string');
  });

  it('should generate IDs with expected length', () => {
    const id = generateId();
    // Math.random().toString(36).substring(2, 12) results in 10 chars usually
    // substring(2, 12) is 10 chars.
    expect(id.length).toBeLessThanOrEqual(10);
    expect(id.length).toBeGreaterThan(5);
  });

  it('should generate unique IDs', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
  });

  it('should only contain alphanumeric characters', () => {
    const id = generateId();
    expect(id).toMatch(/^[a-z0-9]+$/);
  });
});
