/**
 * ClickUp API Servisi
 */

import Constants from 'expo-constants';
import type {
  ClickUpTask,
  CreateTaskPayload,
  UpdateTaskPayload,
  ClickUpConfig,
  ClickUpError,
} from '../types/clickup';

const API_BASE_URL = 'https://api.clickup.com/api/v2';

/**
 * ClickUp yapılandırmasını al
 */
function getConfig(): ClickUpConfig {
  // Geliştirme için hardcoded değerler
  // Üretim ortamında environment variable kullanılmalı
  const apiToken = Constants.expoConfig?.extra?.CLICKUP_API_TOKEN || 
                   process.env.CLICKUP_API_TOKEN || 
                   'pk_101455294_LF8RIU4OD9UNUSPP3P1B8R0S2X4HMPG4';
  
  const workspaceId = Constants.expoConfig?.extra?.CLICKUP_WORKSPACE_ID || 
                      process.env.CLICKUP_WORKSPACE_ID || 
                      '90181713490';
  
  const listId = Constants.expoConfig?.extra?.CLICKUP_LIST_ID || 
                 process.env.CLICKUP_LIST_ID || 
                 '901814074449';

  if (!apiToken || !workspaceId || !listId) {
    throw new Error('ClickUp configuration is missing');
  }

  return { apiToken, workspaceId, listId };
}

/**
 * ClickUp API isteği yap
 */
async function makeRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const config = getConfig();
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': config.apiToken,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error: ClickUpError = await response.json();
    throw new Error(`ClickUp API Error: ${error.err || response.statusText}`);
  }

  return response.json();
}

/**
 * ClickUp bağlantısını test et
 */
export async function testClickUpConnection(): Promise<boolean> {
  try {
    const config = getConfig();
    await makeRequest(`/list/${config.listId}`, { method: 'GET' });
    return true;
  } catch (error) {
    console.error('ClickUp connection test failed:', error);
    return false;
  }
}

/**
 * ClickUp'ta yeni task oluştur (backend API üzerinden)
 */
export async function createClickUpTask(
  payload: CreateTaskPayload & { assigneeEmail?: string }
): Promise<ClickUpTask | null> {
  try {
    const config = getConfig();
    
    // Backend API'ye gönder (otomatik assignee ataması için)
    const apiBaseUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_API_BASE_URL || 
                       process.env.EXPO_PUBLIC_API_BASE_URL;
    
    if (!apiBaseUrl) {
      throw new Error('API base URL not configured');
    }

    const response = await fetch(`${apiBaseUrl}/api/clickup/createTask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        listId: config.listId,
        name: payload.name,
        description: payload.description,
        assigneeEmail: payload.assigneeEmail,
        priority: payload.priority,
        tags: payload.tags,
      }),
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.statusText}`);
    }

    const result = await response.json();
    return result.task;
  } catch (error) {
    console.error('Failed to create ClickUp task:', error);
    return null;
  }
}

/**
 * ClickUp task'ı güncelle
 */
export async function updateClickUpTask(
  taskId: string,
  payload: UpdateTaskPayload
): Promise<ClickUpTask | null> {
  try {
    const response = await makeRequest<ClickUpTask>(
      `/task/${taskId}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      }
    );

    return response;
  } catch (error) {
    console.error('Failed to update ClickUp task:', error);
    return null;
  }
}

/**
 * List'teki tüm task'ları al
 */
export async function getClickUpTasks(): Promise<ClickUpTask[]> {
  try {
    const config = getConfig();
    
    const response = await makeRequest<{ tasks: ClickUpTask[] }>(
      `/list/${config.listId}/task`,
      { method: 'GET' }
    );

    return response.tasks || [];
  } catch (error) {
    console.error('Failed to get ClickUp tasks:', error);
    return [];
  }
}

/**
 * Öncelik seviyesini ClickUp priority'ye dönüştür
 */
export function mapPriorityToClickUp(priority: 'Düşük' | 'Orta' | 'Yüksek'): 1 | 2 | 3 | 4 {
  const mapping = {
    'Yüksek': 2, // high
    'Orta': 3,   // normal
    'Düşük': 4,  // low
  };
  return mapping[priority] as 1 | 2 | 3 | 4;
}

/**
 * Talep durumunu ClickUp status'e dönüştür
 */
export function mapStatusToClickUp(status: 'Açık' | 'Devam Ediyor' | 'Çözüldü'): string {
  const mapping = {
    'Açık': 'to do',
    'Devam Ediyor': 'in progress',
    'Çözüldü': 'complete',
  };
  return mapping[status] || 'to do';
}
