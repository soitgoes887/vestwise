import { generateReadableUUID, generateReadableName } from './configService';

describe('configService', () => {
  describe('generateReadableName', () => {
    it('generates a name in the format adjective-noun', () => {
      const name = generateReadableName();
      const parts = name.split('-');

      expect(parts).toHaveLength(2);
      expect(parts[0]).toMatch(/^[a-z]+$/); // adjective
      expect(parts[1]).toMatch(/^[a-z]+$/); // noun
    });

    it('generates varied names', () => {
      const names = new Set<string>();
      for (let i = 0; i < 100; i++) {
        names.add(generateReadableName());
      }
      // With 32 adjectives * 32 nouns = 1024 combinations,
      // 100 samples should have good variety
      expect(names.size).toBeGreaterThan(50);
    });
  });

  describe('generateReadableUUID', () => {
    it('is an alias for generateReadableName', () => {
      const uuid = generateReadableUUID();
      const parts = uuid.split('-');

      expect(parts).toHaveLength(2);
      expect(parts[0]).toMatch(/^[a-z]+$/);
      expect(parts[1]).toMatch(/^[a-z]+$/);
    });
  });
});
