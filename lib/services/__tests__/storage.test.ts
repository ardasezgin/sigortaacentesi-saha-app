/**
 * Storage servis testleri
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Agency, AgencyLog } from '../../types/agency';

// Mock AsyncStorage
const mockStorage = new Map<string, string>();

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (key: string) => mockStorage.get(key) || null,
    setItem: async (key: string, value: string) => {
      mockStorage.set(key, value);
    },
    removeItem: async (key: string) => {
      mockStorage.delete(key);
    },
    multiRemove: async (keys: string[]) => {
      keys.forEach(key => mockStorage.delete(key));
    },
  },
}));

import {
  getAllAgencies,
  getAgencyByLevhaNo,
  saveAgency,
  saveMultipleAgencies,
  getAllLogs,
  addLog,
  getRecentLogs,
  clearAllData,
} from '../storage';

describe('Storage Service', () => {
  beforeEach(async () => {
    // Her testten önce storage'ı temizle
    mockStorage.clear();
  });

  describe('Agency Operations', () => {
    const sampleAgency: Agency = {
        acenteTuru: "TÜZEL" as const,
        levhaKayitTarihi: "01.01.2020",
        levhaYenilemeTarihi: null,
        levhaNo: "T091014-SAN3",
      acenteUnvani: 'Test Acentesi',
      teknikPersonel: 'Test Yetkili',
      telefon: '0532 123 45 67',
      eposta: 'test@test.com',
      adres: 'Test Adres',
      il: 'İstanbul',
      ilce: 'Kadıköy',
      notlar: '1234567890',
      isActive: 1,
    };

    it('should save and retrieve a single agency', async () => {
      const saved = await saveAgency(sampleAgency);
      expect(saved).toBe(true);

      const retrieved = await getAgencyByLevhaNo('T091014-SAN3');
      expect(retrieved).toEqual(sampleAgency);
    });

    it('should return null for non-existent agency', async () => {
      const retrieved = await getAgencyByLevhaNo('NONEXISTENT');
      expect(retrieved).toBeNull();
    });

    it('should update existing agency', async () => {
      await saveAgency(sampleAgency);

      const updatedAgency = { ...sampleAgency, acenteUnvani: 'Updated Acentesi' };
      await saveAgency(updatedAgency);

      const retrieved = await getAgencyByLevhaNo('T091014-SAN3');
      expect(retrieved?.acenteUnvani).toBe('Updated Acentesi');
    });

    it('should save multiple agencies', async () => {
      const agencies: Agency[] = [
        sampleAgency,
        { ...sampleAgency, levhaNo: 'T091015-IST1', acenteUnvani: 'Acente 2' },
        { ...sampleAgency, levhaNo: 'T091016-ANK2', acenteUnvani: 'Acente 3' },
      ];

      const saved = await saveMultipleAgencies(agencies);
      expect(saved).toBe(true);

      const allAgencies = await getAllAgencies();
      expect(allAgencies).toHaveLength(3);
    });

    it('should merge agencies when saving multiple', async () => {
      await saveAgency(sampleAgency);

      const newAgencies: Agency[] = [
        { ...sampleAgency, acenteUnvani: 'Updated' },
        { ...sampleAgency, levhaNo: 'T091015-IST1', acenteUnvani: 'New Agency' },
      ];

      await saveMultipleAgencies(newAgencies);

      const allAgencies = await getAllAgencies();
      expect(allAgencies).toHaveLength(2);
      
      const updated = await getAgencyByLevhaNo('T091014-SAN3');
      expect(updated?.acenteUnvani).toBe('Updated');
    });

    it('should return empty array when no agencies exist', async () => {
      const agencies = await getAllAgencies();
      expect(agencies).toEqual([]);
    });
  });

  describe('Log Operations', () => {
    const sampleLog: AgencyLog = {
      id: 'test-log-1',
      levhaNo: 'T091014-SAN3',
      kayitTarihi: new Date().toISOString(),
      islemTipi: 'Yeni',
      guncelleyenKullanici: 'Test User',
      yeniVeri: {
        acenteTuru: "TÜZEL" as const,
        levhaKayitTarihi: "01.01.2020",
        levhaYenilemeTarihi: null,
        levhaNo: "T091014-SAN3",
        acenteUnvani: 'Test Acentesi',
        teknikPersonel: 'Test Yetkili',
        telefon: '0532 123 45 67',
        eposta: 'test@test.com',
        adres: 'Test Adres',
        il: 'İstanbul',
        ilce: 'Kadıköy',
        notlar: '1234567890',
        isActive: 1,
      },
    };

    it('should add and retrieve logs', async () => {
      const added = await addLog(sampleLog);
      expect(added).toBe(true);

      const logs = await getAllLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0]).toEqual(sampleLog);
    });

    it('should add logs in reverse chronological order', async () => {
      const log1 = { ...sampleLog, id: 'log-1' };
      const log2 = { ...sampleLog, id: 'log-2' };
      const log3 = { ...sampleLog, id: 'log-3' };

      await addLog(log1);
      await addLog(log2);
      await addLog(log3);

      const logs = await getAllLogs();
      expect(logs[0].id).toBe('log-3');
      expect(logs[1].id).toBe('log-2');
      expect(logs[2].id).toBe('log-1');
    });

    it('should get recent logs with limit', async () => {
      // 15 log ekle
      for (let i = 1; i <= 15; i++) {
        await addLog({ ...sampleLog, id: `log-${i}` });
      }

      const recentLogs = await getRecentLogs(10);
      expect(recentLogs).toHaveLength(10);
      expect(recentLogs[0].id).toBe('log-15');
    });

    it('should return empty array when no logs exist', async () => {
      const logs = await getAllLogs();
      expect(logs).toEqual([]);
    });
  });

  describe('Clear Data', () => {
    it('should clear all data', async () => {
      // Veri ekle
      await saveAgency({
        acenteTuru: 'TÜZEL',
        levhaNo: 'TEST',
        levhaKayitTarihi: '01.01.2020',
        levhaYenilemeTarihi: null,
        acenteUnvani: 'Test',
        adres: 'Test',
        il: 'Test',
        ilce: 'Test',
        telefon: '123',
        eposta: 'test@test.com',
        teknikPersonel: 'Test',
        isActive: 1,
      });

      await addLog({
        id: 'test',
        levhaNo: 'TEST',
        kayitTarihi: new Date().toISOString(),
        islemTipi: 'Yeni',
        guncelleyenKullanici: 'Test',
        yeniVeri: {} as Agency,
      });

      // Temizle
      const cleared = await clearAllData();
      expect(cleared).toBe(true);

      // Kontrol et
      const agencies = await getAllAgencies();
      const logs = await getAllLogs();
      expect(agencies).toEqual([]);
      expect(logs).toEqual([]);
    });
  });
});
