/**
 * ClickUp API servis testleri
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';

// Mock Constants
vi.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {
        CLICKUP_API_TOKEN: process.env.CLICKUP_API_TOKEN,
        CLICKUP_WORKSPACE_ID: process.env.CLICKUP_WORKSPACE_ID,
        CLICKUP_LIST_ID: process.env.CLICKUP_LIST_ID,
      },
    },
  },
}));

import {
  testClickUpConnection,
  createClickUpTask,
  mapPriorityToClickUp,
  mapStatusToClickUp,
} from '../clickup';

describe.skip('ClickUp Service', () => {
  beforeAll(() => {
    // Ensure environment variables are set
    if (!process.env.CLICKUP_API_TOKEN) {
      throw new Error('CLICKUP_API_TOKEN is required for tests');
    }
  });

  describe('Connection Test', () => {
    it('should successfully connect to ClickUp API', async () => {
      const isConnected = await testClickUpConnection();
      expect(isConnected).toBe(true);
    }, 10000); // 10 second timeout for API call
  });

  describe('Task Creation', () => {
    it('should create a task in ClickUp', async () => {
      const task = await createClickUpTask({
        name: 'Test Task from Vitest',
        description: 'This is a test task created by automated tests',
        priority: 3,
        tags: ['test', 'automated'],
      });

      expect(task).not.toBeNull();
      if (task) {
        expect(task.id).toBeDefined();
        expect(task.name).toBe('Test Task from Vitest');
        expect(task.url).toContain('clickup.com');
      }
    }, 10000);
  });

  describe('Priority Mapping', () => {
    it('should map Turkish priority to ClickUp priority', () => {
      expect(mapPriorityToClickUp('Yüksek')).toBe(2);
      expect(mapPriorityToClickUp('Orta')).toBe(3);
      expect(mapPriorityToClickUp('Düşük')).toBe(4);
    });
  });

  describe('Status Mapping', () => {
    it('should map Turkish status to ClickUp status', () => {
      expect(mapStatusToClickUp('Açık')).toBe('to do');
      expect(mapStatusToClickUp('Devam Ediyor')).toBe('in progress');
      expect(mapStatusToClickUp('Çözüldü')).toBe('complete');
    });
  });
});
