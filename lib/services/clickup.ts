/**
 * ClickUp API Servisi (Client-Side)
 * 
 * Sunucu üzerinden değil, doğrudan mobil uygulamadan ClickUp API'ye erişir.
 * Şirket içi kullanım için güvenlidir.
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

// Yeni ClickUp Personal API Token
const DEFAULT_TOKEN = 'pk_101455294_EFVLZ8AR7IZZ5SN7EWQDR3OCG71O2TS5';

/**
 * ClickUp yapılandırmasını al
 */
export function getConfig(): ClickUpConfig {
  const apiToken =
    Constants.expoConfig?.extra?.CLICKUP_API_TOKEN ||
    process.env.CLICKUP_API_TOKEN ||
    DEFAULT_TOKEN;

  const workspaceId =
    Constants.expoConfig?.extra?.CLICKUP_WORKSPACE_ID ||
    process.env.CLICKUP_WORKSPACE_ID ||
    '90210697489';

  const listId =
    Constants.expoConfig?.extra?.CLICKUP_LIST_ID ||
    process.env.CLICKUP_LIST_ID ||
    '901814074449'; // SahaAPP listesi

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
      Authorization: config.apiToken,
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
 * Workspace üyelerini getir (Talebi Giren dropdown için)
 */
export async function getClickUpMembers(): Promise<
  Array<{ id: number; username: string; email: string }>
> {
  const { teams } = await makeRequest<{
    teams: Array<{
      id: string;
      members: Array<{ user: { id: number; username: string; email: string } }>;
    }>;
  }>('/team');

  const usersMap = new Map<number, { id: number; username: string; email: string }>();
  for (const team of teams) {
    for (const member of team.members) {
      const u = member.user;
      if (u && u.id && !usersMap.has(u.id)) {
        usersMap.set(u.id, {
          id: u.id,
          username: u.username || u.email || String(u.id),
          email: u.email,
        });
      }
    }
  }

  return Array.from(usersMap.values())
    .filter((u) => u.username)
    .sort((a, b) => a.username.localeCompare(b.username, 'tr'));
}

/**
 * ClickUp bağlantısını test et
 */
export async function testClickUpConnection(): Promise<boolean> {
  try {
    await makeRequest('/user');
    return true;
  } catch (error) {
    console.error('ClickUp connection test failed:', error);
    return false;
  }
}

/**
 * ClickUp'ta yeni task oluştur (doğrudan API)
 */
export async function createClickUpTask(
  payload: CreateTaskPayload & {
    assigneeEmail?: string;
    assigneeIds?: number[];
    listId?: string;
  }
): Promise<ClickUpTask | null> {
  try {
    const config = getConfig();
    const targetListId = payload.listId || config.listId;

    const body: Record<string, unknown> = {
      name: payload.name,
    };

    if (payload.description) body.description = payload.description;
    if (payload.assigneeIds && payload.assigneeIds.length > 0) {
      body.assignees = payload.assigneeIds;
    }
    if (payload.priority) body.priority = payload.priority;
    if (payload.tags && payload.tags.length > 0) body.tags = payload.tags;
    if (payload.custom_fields && payload.custom_fields.length > 0) {
      body.custom_fields = payload.custom_fields;
    }

    const task = await makeRequest<ClickUpTask>(`/list/${targetListId}/task`, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    return task;
  } catch (error) {
    console.error('Failed to create ClickUp task:', error);
    return null;
  }
}

/**
 * ClickUp task'a dosya ekle (attachment)
 * @param taskId - ClickUp task ID
 * @param fileUri - Yerel dosya URI'si (file:// veya content://)
 * @param fileName - Dosya adı
 * @param mimeType - MIME tipi (örn. image/jpeg)
 */
export async function addClickUpAttachment(
  taskId: string,
  fileUri: string,
  fileName: string,
  mimeType: string = 'application/octet-stream'
): Promise<boolean> {
  try {
    const config = getConfig();

    // FormData ile multipart/form-data isteği
    const formData = new FormData();
    // React Native'de Blob yerine { uri, name, type } objesi kullanılır
    formData.append('attachment', {
      uri: fileUri,
      name: fileName,
      type: mimeType,
    } as any);

    const response = await fetch(`${API_BASE_URL}/task/${taskId}/attachment`, {
      method: 'POST',
      headers: {
        Authorization: config.apiToken,
        // Content-Type'ı manuel set etme - fetch otomatik boundary ekler
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ClickUp] Attachment upload failed:', errorText);
      return false;
    }

    console.log('[ClickUp] Attachment uploaded successfully:', fileName);
    return true;
  } catch (error) {
    console.error('[ClickUp] Failed to add attachment:', error);
    return false;
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
    const response = await makeRequest<ClickUpTask>(`/task/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
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
  const mapping: Record<string, 1 | 2 | 3 | 4> = {
    Yüksek: 2,
    Orta: 3,
    Düşük: 4,
  };
  return mapping[priority] ?? 3;
}

/**
 * Talep durumunu ClickUp status'e dönüştür
 */
export function mapStatusToClickUp(status: 'Açık' | 'Devam Ediyor' | 'Çözüldü'): string {
  const mapping: Record<string, string> = {
    Açık: 'to do',
    'Devam Ediyor': 'in progress',
    Çözüldü: 'complete',
  };
  return mapping[status] || 'to do';
}
