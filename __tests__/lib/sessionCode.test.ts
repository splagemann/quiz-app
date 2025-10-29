import { generateSessionCode, isValidSessionCode } from '@/lib/sessionCode';

describe('generateSessionCode', () => {
  it('should generate a 6-character code', () => {
    const code = generateSessionCode();
    expect(code).toHaveLength(6);
  });

  it('should only contain uppercase letters and numbers', () => {
    const code = generateSessionCode();
    expect(code).toMatch(/^[A-Z0-9]{6}$/);
  });

  it('should generate unique codes', () => {
    const codes = new Set();
    for (let i = 0; i < 100; i++) {
      codes.add(generateSessionCode());
    }
    // With random generation, we expect high uniqueness
    expect(codes.size).toBeGreaterThan(90);
  });
});

describe('isValidSessionCode', () => {
  it('should return true for valid 6-character uppercase alphanumeric codes', () => {
    expect(isValidSessionCode('ABC123')).toBe(true);
    expect(isValidSessionCode('XYZABC')).toBe(true);
    expect(isValidSessionCode('123456')).toBe(true);
  });

  it('should return false for invalid codes', () => {
    expect(isValidSessionCode('abc123')).toBe(false); // lowercase
    expect(isValidSessionCode('ABC12')).toBe(false); // too short
    expect(isValidSessionCode('ABC1234')).toBe(false); // too long
    expect(isValidSessionCode('ABC-12')).toBe(false); // special character
    expect(isValidSessionCode('')).toBe(false); // empty
  });
});
