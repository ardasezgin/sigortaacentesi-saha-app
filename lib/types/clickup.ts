/**
 * ClickUp API tip tanımlamaları
 */

export interface ClickUpTask {
  id: string;
  name: string;
  description?: string;
  status: {
    status: string;
    color: string;
  };
  priority?: {
    id: string;
    priority: string;
    color: string;
  };
  due_date?: string;
  tags?: string[];
  custom_fields?: ClickUpCustomField[];
  url: string;
}

export interface ClickUpCustomField {
  id: string;
  name: string;
  value: string | number | boolean;
}

export interface CreateTaskPayload {
  name: string;
  description?: string;
  priority?: 1 | 2 | 3 | 4; // 1=urgent, 2=high, 3=normal, 4=low
  status?: string;
  tags?: string[];
  due_date?: number; // Unix timestamp in milliseconds
}

export interface UpdateTaskPayload {
  name?: string;
  description?: string;
  priority?: 1 | 2 | 3 | 4;
  status?: string;
  tags?: string[];
}

export interface ClickUpConfig {
  apiToken: string;
  workspaceId: string;
  listId: string;
}

export interface ClickUpError {
  err: string;
  ECODE: string;
}
