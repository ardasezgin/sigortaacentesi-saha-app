/**
 * ClickUp API Client
 * 
 * Provides methods to interact with ClickUp API using Personal API Token.
 * Used for:
 * - Fetching workspace users
 * - Creating tasks
 * - Assigning tasks to users
 */

const CLICKUP_API_BASE = "https://api.clickup.com/api/v2";
const CLICKUP_API_TOKEN = process.env.CLICKUP_API_TOKEN;

if (!CLICKUP_API_TOKEN) {
  console.warn("[ClickUp] API token not configured");
}

export interface ClickUpUser {
  id: number;
  username: string;
  email: string;
  color: string;
  profilePicture?: string;
  initials: string;
}

export interface ClickUpTeam {
  id: string;
  name: string;
  color: string;
  avatar?: string;
  members: Array<{
    user: ClickUpUser;
  }>;
}

export interface ClickUpTask {
  id: string;
  name: string;
  description?: string;
  status: {
    status: string;
    color: string;
  };
  assignees: ClickUpUser[];
  url: string;
}

export interface CreateTaskParams {
  listId: string;
  name: string;
  description?: string;
  assignees?: number[]; // ClickUp user IDs
  priority?: 1 | 2 | 3 | 4; // 1=urgent, 2=high, 3=normal, 4=low
  dueDate?: number; // Unix timestamp in milliseconds
  tags?: string[];
}

class ClickUpClient {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${CLICKUP_API_BASE}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: this.token,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ClickUp API error: ${response.status} ${error}`);
    }

    return response.json();
  }

  /**
   * Get authorized user (token owner)
   */
  async getAuthorizedUser(): Promise<{ user: ClickUpUser }> {
    return this.request("/user");
  }

  /**
   * Get all teams (workspaces) accessible by the token
   */
  async getTeams(): Promise<{ teams: ClickUpTeam[] }> {
    return this.request("/team");
  }

  /**
   * Get all members of a team
   */
  async getTeamMembers(teamId: string): Promise<{ teams: ClickUpTeam[] }> {
    return this.request(`/team`);
  }

  /**
   * Create a task in a list
   */
  async createTask(params: CreateTaskParams): Promise<ClickUpTask> {
    const { listId, ...taskData } = params;
    
    const body: any = {
      name: taskData.name,
    };

    if (taskData.description) {
      body.description = taskData.description;
    }

    if (taskData.assignees && taskData.assignees.length > 0) {
      body.assignees = taskData.assignees;
    }

    if (taskData.priority) {
      body.priority = taskData.priority;
    }

    if (taskData.dueDate) {
      body.due_date = taskData.dueDate;
    }

    if (taskData.tags && taskData.tags.length > 0) {
      body.tags = taskData.tags;
    }

    return this.request(`/list/${listId}/task`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  /**
   * Get all users from all accessible teams
   * Returns a flat list of unique users
   */
  async getAllUsers(): Promise<ClickUpUser[]> {
    const { teams } = await this.getTeams();
    
    const usersMap = new Map<number, ClickUpUser>();
    
    for (const team of teams) {
      for (const member of team.members) {
        if (!usersMap.has(member.user.id)) {
          usersMap.set(member.user.id, member.user);
        }
      }
    }

    return Array.from(usersMap.values());
  }
}

/**
 * Get ClickUp client instance
 */
export function getClickUpClient(): ClickUpClient | null {
  if (!CLICKUP_API_TOKEN) {
    return null;
  }
  return new ClickUpClient(CLICKUP_API_TOKEN);
}

/**
 * Sync ClickUp users to database
 * Matches users by email and stores ClickUp user ID
 */
export async function syncClickUpUsers(): Promise<{
  synced: number;
  failed: number;
  errors: string[];
}> {
  const client = getClickUpClient();
  if (!client) {
    throw new Error("ClickUp API token not configured");
  }

  const clickupUsers = await client.getAllUsers();
  
  // TODO: Implement database sync logic
  // For now, just return the users
  console.log(`[ClickUp] Found ${clickupUsers.length} users`);
  
  return {
    synced: 0,
    failed: 0,
    errors: [],
  };
}
