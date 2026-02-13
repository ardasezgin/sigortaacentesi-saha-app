/**
 * Visit storage servis testleri
 * Backend API kullanıyor (AsyncStorage yerine)
 */

import { describe, it, expect, vi } from 'vitest';

// Mock tRPC client
vi.mock('@trpc/client', () => ({
  createTRPCClient: vi.fn(() => ({
    visits: {
      getAll: { query: vi.fn(async () => []) },
      getRecent: { query: vi.fn(async () => []) },
      getByAgency: { query: vi.fn(async () => []) },
      add: { mutate: vi.fn(async () => ({ success: true, id: 1 })) },
    },
    communications: {
      getAll: { query: vi.fn(async () => []) },
      add: { mutate: vi.fn(async () => ({ success: true, id: 1 })) },
    },
    requests: {
      getAll: { query: vi.fn(async () => []) },
      getRecent: { query: vi.fn(async () => []) },
      add: { mutate: vi.fn(async () => ({ success: true, id: 1 })) },
      update: { mutate: vi.fn(async () => ({ success: true })) },
    },
    dashboard: {
      getMetrics: {
        query: vi.fn(async () => ({
          totalAgencies: 3,
          activeAgencies: 2,
          passiveAgencies: 1,
          totalVisitsThisWeek: 1,
          totalVisitsThisMonth: 5,
          newAgenciesThisMonth: 0,
          openRequests: 1,
          recentVisits: [],
          recentRequests: [],
        })),
      },
    },
  })),
  httpBatchLink: vi.fn(() => ({})),
}));

vi.mock('superjson', () => ({
  default: {},
}));

vi.mock('@/constants/oauth', () => ({
  getApiBaseUrl: vi.fn(() => 'http://localhost:3000'),
}));

vi.mock('@/lib/_core/auth', () => ({
  getSessionToken: vi.fn(async () => 'mock-token'),
}));

import {
  getAllVisits,
  addVisit,
  getVisitsByAgency,
  getRecentVisits,
  getAllCommunications,
  addCommunication,
  getAllRequests,
  addRequest,
  updateRequest,
  getRecentRequests,
  getDashboardMetrics,
} from '../visit-storage';

describe('Visit Storage Service (Backend API)', () => {
  describe('Visit Operations', () => {
    it('should get all visits from backend', async () => {
      const visits = await getAllVisits();
      expect(visits).toBeDefined();
      expect(Array.isArray(visits)).toBe(true);
    });

    it('should get visits by agency from backend', async () => {
      const visits = await getVisitsByAgency('T091014-SAN3');
      expect(visits).toBeDefined();
      expect(Array.isArray(visits)).toBe(true);
    });

    it('should get recent visits from backend', async () => {
      const visits = await getRecentVisits(10);
      expect(visits).toBeDefined();
      expect(Array.isArray(visits)).toBe(true);
    });

    it('should add visit to backend', async () => {
      const result = await addVisit({
        id: 'test-1',
        levhaNo: 'T091014-SAN3',
        iletisimTuru: 'Ziyaret',
        isOrtagi: 'Mevcut Acente',
        acenteAdi: 'Test Acente',
        kimleGorusuldu: 'Test Yetkili',
        tarih: new Date().toISOString().split('T')[0],
        gundem: 'Genel Performans',
        detayAciklama: 'Test',
        createdBy: 'Test User',
        createdAt: new Date().toISOString(),
      });
      expect(result).toBe(true);
    });
  });

  describe('Communication Operations', () => {
    it('should get all communications from backend', async () => {
      const comms = await getAllCommunications();
      expect(comms).toBeDefined();
      expect(Array.isArray(comms)).toBe(true);
    });

    it('should add communication to backend', async () => {
      const result = await addCommunication({
        id: 'comm-1',
        levhaNo: 'T091014-SAN3',
        acenteAdi: 'Test Acente',
        type: 'Telefon',
        subject: 'Test konu',
        notes: 'Test iletişim',
        createdBy: 'Test User',
        createdAt: new Date().toISOString(),
      });
      expect(result).toBe(true);
    });
  });

  describe('Request Operations', () => {
    it('should get all requests from backend', async () => {
      const requests = await getAllRequests();
      expect(requests).toBeDefined();
      expect(Array.isArray(requests)).toBe(true);
    });

    it('should get recent requests from backend', async () => {
      const requests = await getRecentRequests(10);
      expect(requests).toBeDefined();
      expect(Array.isArray(requests)).toBe(true);
    });

    it('should add request to backend', async () => {
      const result = await addRequest({
        id: 'req-1',
        levhaNo: 'T091014-SAN3',
        acenteAdi: 'Test Acente',
        requestType: 'Talep',
        priority: 'Orta',
        status: 'Açık',
        subject: 'Test talep',
        description: 'Test açıklama',
        createdBy: 'Test User',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      expect(result).toBe(true);
    });

    it('should update request in backend', async () => {
      const result = await updateRequest('1', { status: 'Çözüldü' });
      expect(result).toBe(true);
    });
  });

  describe('Dashboard Metrics', () => {
    it('should get dashboard metrics from backend', async () => {
      const metrics = await getDashboardMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.totalAgencies).toBe(3);
      expect(metrics.activeAgencies).toBe(2);
      expect(metrics.passiveAgencies).toBe(1);
      expect(metrics.totalVisitsThisWeek).toBe(1);
      expect(metrics.openRequests).toBe(1);
    });
  });
});
