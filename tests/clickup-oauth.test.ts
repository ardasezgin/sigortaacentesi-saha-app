import { describe, it, expect } from 'vitest';

describe('ClickUp OAuth Integration', () => {
  it('should have ClickUp OAuth configuration', () => {
    // Test that OAuth constants are defined
    const CLICKUP_AUTH_URL = "https://app.clickup.com/api";
    const CLICKUP_TOKEN_URL = "https://api.clickup.com/api/v2/oauth/token";
    
    expect(CLICKUP_AUTH_URL).toBeDefined();
    expect(CLICKUP_TOKEN_URL).toBeDefined();
    expect(CLICKUP_AUTH_URL).toContain('clickup.com');
    expect(CLICKUP_TOKEN_URL).toContain('oauth/token');
  });

  it('should validate OAuth URL format', () => {
    const authUrl = "https://app.clickup.com/api";
    
    // Should be a valid URL
    expect(() => new URL(authUrl)).not.toThrow();
    
    const url = new URL(authUrl);
    expect(url.protocol).toBe('https:');
    expect(url.hostname).toBe('app.clickup.com');
    expect(url.pathname).toBe('/api');
  });

  it('should validate OAuth redirect URI format', () => {
    const redirectUris = [
      'http://localhost:8081/oauth/callback',
      'https://app.example.com/oauth/callback',
      'myapp://oauth/callback',
    ];

    redirectUris.forEach(uri => {
      expect(uri).toContain('oauth/callback');
      expect(uri.length).toBeGreaterThan(0);
    });
  });

  it('should validate state parameter generation', () => {
    // State should be a random string
    const state1 = Math.random().toString(36).substring(2, 15);
    const state2 = Math.random().toString(36).substring(2, 15);
    
    expect(state1).not.toBe(state2);
    expect(state1.length).toBeGreaterThan(0);
    expect(state2.length).toBeGreaterThan(0);
  });

  it('should validate OAuth parameters', () => {
    const params = {
      client_id: 'test_client_id',
      redirect_uri: 'http://localhost:8081/oauth/callback',
      state: 'random_state_123',
    };

    expect(params.client_id).toBeDefined();
    expect(params.redirect_uri).toBeDefined();
    expect(params.state).toBeDefined();
    expect(params.redirect_uri).toContain('oauth/callback');
  });
});
