/**
 * ClickUp User Sync Service
 * İlk uygulama açılışında otomatik olarak ClickUp kullanıcılarını database'e sync eder
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const SYNC_KEY = '@clickup_sync_completed';
const SYNC_TIMESTAMP_KEY = '@clickup_sync_timestamp';

/**
 * Sync durumunu kontrol et
 */
export async function isSyncCompleted(): Promise<boolean> {
  const syncCompleted = await AsyncStorage.getItem(SYNC_KEY);
  return syncCompleted === 'true';
}

/**
 * Sync başarılı olarak işaretle
 */
export async function markSyncCompleted(): Promise<void> {
  await AsyncStorage.setItem(SYNC_KEY, 'true');
  await AsyncStorage.setItem(SYNC_TIMESTAMP_KEY, new Date().toISOString());
}

/**
 * Sync durumunu sıfırla (test için)
 */
export async function resetSyncStatus(): Promise<void> {
  await AsyncStorage.removeItem(SYNC_KEY);
  await AsyncStorage.removeItem(SYNC_TIMESTAMP_KEY);
}

/**
 * Son sync zamanını al
 */
export async function getLastSyncTime(): Promise<Date | null> {
  const timestamp = await AsyncStorage.getItem(SYNC_TIMESTAMP_KEY);
  return timestamp ? new Date(timestamp) : null;
}

/**
 * Sync mesajını oluştur
 */
export function getSyncMessage(result: {
  success: boolean;
  synced: number;
  total: number;
  failed: number;
}): string {
  if (result.success) {
    if (result.synced === 0) {
      return `ClickUp'ta ${result.total} kullanıcı bulundu, ancak hiçbiri email ile eşleşmedi`;
    }
    return `${result.synced}/${result.total} kullanıcı başarıyla senkronize edildi`;
  }
  return 'ClickUp senkronizasyonu başarısız oldu';
}
