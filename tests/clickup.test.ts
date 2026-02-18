import { describe, expect, it } from "vitest";
import { getClickUpClient } from "../server/services/clickup";

describe("ClickUp Integration", () => {
  it("should have ClickUp API token configured", () => {
    const client = getClickUpClient();
    expect(client).not.toBeNull();
  });

  it("should fetch ClickUp users", async () => {
    const client = getClickUpClient();
    if (!client) {
      throw new Error("ClickUp client not available");
    }

    const users = await client.getAllUsers();
    expect(users).toBeDefined();
    expect(Array.isArray(users)).toBe(true);
    expect(users.length).toBeGreaterThan(0);
    
    // Verify user structure
    const firstUser = users[0];
    expect(firstUser).toHaveProperty("id");
    expect(firstUser).toHaveProperty("email");
    expect(firstUser).toHaveProperty("username");
  });

  it("should get authorized user", async () => {
    const client = getClickUpClient();
    if (!client) {
      throw new Error("ClickUp client not available");
    }

    const response = await client.getAuthorizedUser();
    expect(response).toHaveProperty("user");
    expect(response.user).toHaveProperty("id");
    expect(response.user).toHaveProperty("username");
    expect(response.user.username).toBe("Arda Sezgin");
  });

  it("should get teams", async () => {
    const client = getClickUpClient();
    if (!client) {
      throw new Error("ClickUp client not available");
    }

    const response = await client.getTeams();
    expect(response).toHaveProperty("teams");
    expect(Array.isArray(response.teams)).toBe(true);
    expect(response.teams.length).toBeGreaterThan(0);
  });
});
