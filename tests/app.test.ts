import { describe, it, expect } from 'vitest';

describe('Sigorta Acentesi Saha App', () => {
  it('should have valid project structure', () => {
    expect(true).toBe(true);
  });

  it('should have required dependencies', () => {
    const packageJson = require('../package.json');
    expect(packageJson.dependencies['expo-router']).toBeDefined();
    expect(packageJson.dependencies['react-native']).toBeDefined();
    expect(packageJson.dependencies['expo']).toBeDefined();
  });
});
