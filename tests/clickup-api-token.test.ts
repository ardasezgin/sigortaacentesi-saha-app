import { describe, it, expect } from 'vitest';

describe('ClickUp API Token Validation', () => {
  const API_TOKEN = process.env.CLICKUP_API_TOKEN;
  const API_BASE_URL = 'https://api.clickup.com/api/v2';

  it('should have CLICKUP_API_TOKEN environment variable', () => {
    expect(API_TOKEN).toBeDefined();
    expect(API_TOKEN).not.toBe('');
    expect(typeof API_TOKEN).toBe('string');
    expect(API_TOKEN).toMatch(/^pk_/); // ClickUp personal tokens start with pk_
  });

  it('should validate token format', () => {
    expect(API_TOKEN).toMatch(/^pk_\d+_[A-Z0-9]+$/);
  });

  it('should successfully authenticate with ClickUp API', async () => {
    // Test authentication by fetching user info
    const response = await fetch(`${API_BASE_URL}/user`, {
      headers: {
        'Authorization': API_TOKEN!,
        'Content-Type': 'application/json',
      },
    });

    expect(response.ok).toBe(true);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toBeDefined();
    expect(data.user).toBeDefined();
    expect(data.user.id).toBeDefined();
  });

  it('should have valid user data from ClickUp', async () => {
    const response = await fetch(`${API_BASE_URL}/user`, {
      headers: {
        'Authorization': API_TOKEN!,
      },
    });

    const data = await response.json();
    
    expect(data.user.username).toBeDefined();
    expect(data.user.email).toBeDefined();
    expect(typeof data.user.id).toBe('number');
  });
});
