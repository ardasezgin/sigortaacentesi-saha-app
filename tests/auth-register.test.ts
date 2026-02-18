import { describe, expect, it, beforeEach } from "vitest";
import { appRouter } from "../server/routers";
import type { TrpcContext } from "../server/_core/context";
import * as db from "../server/db";

function createMockContext(): TrpcContext {
  const cookies: Record<string, { value: string; options: Record<string, unknown> }> = {};
  
  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
      hostname: "localhost",
    } as TrpcContext["req"],
    res: {
      cookie: (name: string, value: string, options: Record<string, unknown>) => {
        cookies[name] = { value, options };
      },
      clearCookie: () => {},
    } as any as TrpcContext["res"],
  };
  
  return ctx;
}

describe("User Registration and Login", () => {
  const testPassword = "testpassword123";
  const testName = "Test User";
  
  // Generate unique email for each test
  const getUniqueEmail = () => `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;

  it("should register a new user", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    const testEmail = getUniqueEmail();

    const result = await caller.auth.register({
      name: testName,
      email: testEmail,
      password: testPassword,
    });

    expect(result.success).toBe(true);
    expect(result.user.email).toBe(testEmail);
    expect(result.user.name).toBe(testName);
    expect(result.user.loginMethod).toBe("email");
    expect(result.sessionToken).toBeTruthy();
  });

  it("should not allow duplicate email registration", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    const testEmail = getUniqueEmail();

    // First registration should succeed
    await caller.auth.register({
      name: testName,
      email: testEmail,
      password: testPassword,
    });

    // Second registration with same email should fail
    await expect(
      caller.auth.register({
        name: "Another User",
        email: testEmail,
        password: "differentpassword",
      })
    ).rejects.toThrow("Bu email adresi zaten kullanılıyor");
  });

  it("should login with correct credentials", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    const testEmail = getUniqueEmail();

    // Register user first
    await caller.auth.register({
      name: testName,
      email: testEmail,
      password: testPassword,
    });

    // Login with correct credentials
    const result = await caller.auth.login({
      email: testEmail,
      password: testPassword,
    });

    expect(result.success).toBe(true);
    expect(result.user.email).toBe(testEmail);
    expect(result.sessionToken).toBeTruthy();
  });

  it("should not login with incorrect password", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    const testEmail = getUniqueEmail();

    // Register user first
    await caller.auth.register({
      name: testName,
      email: testEmail,
      password: testPassword,
    });

    // Try to login with wrong password
    await expect(
      caller.auth.login({
        email: testEmail,
        password: "wrongpassword",
      })
    ).rejects.toThrow("Email veya şifre hatalı");
  });

  it("should not login with non-existent email", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.login({
        email: "nonexistent@example.com",
        password: "anypassword",
      })
    ).rejects.toThrow("Email veya şifre hatalı");
  });

  it("should validate password minimum length", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.register({
        name: testName,
        email: `short-${Date.now()}@example.com`,
        password: "12345", // Too short
      })
    ).rejects.toThrow();
  });

  it("should validate name minimum length", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.register({
        name: "A", // Too short
        email: `name-${Date.now()}@example.com`,
        password: "validpassword",
      })
    ).rejects.toThrow();
  });

  it("should validate email format", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.register({
        name: testName,
        email: "invalid-email", // Invalid format
        password: "validpassword",
      })
    ).rejects.toThrow();
  });
});
