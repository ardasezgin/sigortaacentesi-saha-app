import { describe, it, expect } from 'vitest';

describe('ClickUp OAuth Credentials', () => {
  it('should have CLICKUP_CLIENT_ID environment variable', () => {
    const clientId = process.env.CLICKUP_CLIENT_ID;
    
    expect(clientId).toBeDefined();
    expect(clientId).not.toBe('YOUR_CLICKUP_CLIENT_ID');
    expect(clientId).not.toBe('');
    expect(typeof clientId).toBe('string');
    expect(clientId!.length).toBeGreaterThan(10);
  });

  it('should have CLICKUP_CLIENT_SECRET environment variable', () => {
    const clientSecret = process.env.CLICKUP_CLIENT_SECRET;
    
    expect(clientSecret).toBeDefined();
    expect(clientSecret).not.toBe('YOUR_CLICKUP_CLIENT_SECRET');
    expect(clientSecret).not.toBe('');
    expect(typeof clientSecret).toBe('string');
    expect(clientSecret!.length).toBeGreaterThan(10);
  });

  it('should have valid ClickUp OAuth URL format', () => {
    const clientId = process.env.CLICKUP_CLIENT_ID;
    const redirectUri = 'https://8081-iibj772l4m2t9g4rc6ugm-4b87d2f6.sg1.manus.computer/oauth/callback';
    
    // Build auth URL
    const authUrl = `https://app.clickup.com/api?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    
    // Validate URL
    expect(() => new URL(authUrl)).not.toThrow();
    
    const url = new URL(authUrl);
    expect(url.hostname).toBe('app.clickup.com');
    expect(url.searchParams.get('client_id')).toBe(clientId);
    expect(url.searchParams.get('redirect_uri')).toBe(redirectUri);
  });

  it('should validate credentials format', () => {
    const clientId = process.env.CLICKUP_CLIENT_ID;
    const clientSecret = process.env.CLICKUP_CLIENT_SECRET;
    
    // ClickUp Client IDs are typically alphanumeric uppercase
    expect(clientId).toMatch(/^[A-Z0-9]+$/);
    
    // ClickUp Client Secrets are typically alphanumeric uppercase
    expect(clientSecret).toMatch(/^[A-Z0-9]+$/);
  });
});
