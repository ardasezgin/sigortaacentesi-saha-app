import { describe, it, expect } from "vitest";

describe("ClickUp API Token Validation", () => {
  it("should validate ClickUp API token by fetching authorized user", async () => {
    const token = process.env.CLICKUP_API_TOKEN;
    
    expect(token).toBeDefined();
    expect(token).toMatch(/^pk_\d+_[A-Z0-9]+$/);

    const response = await fetch("https://api.clickup.com/api/v2/user", {
      headers: {
        Authorization: token!,
      },
    });

    expect(response.ok).toBe(true);
    
    const data = await response.json();
    expect(data.user).toBeDefined();
    expect(data.user.id).toBeDefined();
    expect(data.user.email).toBeDefined();
  }, 10000); // 10 second timeout for API call
});
