import { generateReadableUUID } from './configService';

describe('configService', () => {
  describe('generateReadableUUID', () => {
    it('generates a UUID in the format adjective-noun-number', () => {
      const uuid = generateReadableUUID();
      const parts = uuid.split('-');

      expect(parts).toHaveLength(3);
      expect(parts[0]).toMatch(/^[a-z]+$/); // adjective
      expect(parts[1]).toMatch(/^[a-z]+$/); // noun
      expect(parts[2]).toMatch(/^\d+$/); // number
    });

    it('generates unique UUIDs', () => {
      const uuids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        uuids.add(generateReadableUUID());
      }
      // With high probability, 100 UUIDs should all be unique
      expect(uuids.size).toBeGreaterThan(95);
    });

    it('generates UUIDs with numbers up to 5 digits', () => {
      const uuid = generateReadableUUID();
      const number = uuid.split('-')[2];
      expect(parseInt(number)).toBeLessThan(100000);
      expect(parseInt(number)).toBeGreaterThanOrEqual(0);
    });
  });
});
