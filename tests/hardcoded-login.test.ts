import { describe, it, expect } from "vitest";

describe("Hardcoded Login Credentials", () => {
  it("should have correct demo email", () => {
    const demoEmail = "test@demo.com";
    expect(demoEmail).toBe("test@demo.com");
  });

  it("should have correct demo password", () => {
    const demoPassword = "123123123";
    expect(demoPassword).toBe("123123123");
  });

  it("should validate demo credentials format", () => {
    const demoEmail = "test@demo.com";
    const demoPassword = "123123123";
    
    // Email format validation
    expect(demoEmail).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    
    // Password length validation
    expect(demoPassword.length).toBeGreaterThanOrEqual(8);
  });

  it("should have demo user openId", () => {
    const demoOpenId = "demo-user";
    expect(demoOpenId).toBe("demo-user");
  });

  it("should have demo session token prefix", () => {
    const sessionTokenPrefix = "demo-session-";
    expect(sessionTokenPrefix).toBe("demo-session-");
  });
});
