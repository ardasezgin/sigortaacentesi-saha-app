/**
 * Visit storage servis testleri
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Visit, Communication, Request } from '../../types/visit';

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
  getAllVisits,
  addVisit,
  getVisitsByAgency,
  getRecentVisits,
  getAllCommunications,
  addCommunication,
  getCommunicationsByAgency,
  getAllRequests,
  addRequest,
  updateRequest,
  getRequestsByAgency,
  getOpenRequests,
  getDashboardMetrics,
} from '../visit-storage';

describe('Visit Storage Service', () => {
  beforeEach(async () => {
    mockStorage.clear();
  });

  describe('Visit Operations', () => {
    const sampleVisit: Visit = {
      id: 'visit-1',
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
    };

    it('should add and retrieve visits', async () => {
      const added = await addVisit(sampleVisit);
      expect(added).toBe(true);

      const visits = await getAllVisits();
      expect(visits).toHaveLength(1);
      expect(visits[0].id).toBe('visit-1');
    });

    it('should get visits by agency', async () => {
      await addVisit(sampleVisit);
      await addVisit({ ...sampleVisit, id: 'visit-2', levhaNo: 'T091015-IST1' });

      const agencyVisits = await getVisitsByAgency('T091014-SAN3');
      expect(agencyVisits).toHaveLength(1);
      expect(agencyVisits[0].levhaNo).toBe('T091014-SAN3');
    });

    it('should get recent visits with limit', async () => {
      for (let i = 0; i < 15; i++) {
        await addVisit({ ...sampleVisit, id: `visit-${i}` });
      }

      const recentVisits = await getRecentVisits(10);
      expect(recentVisits).toHaveLength(10);
    });
  });

  describe('Communication Operations', () => {
    const sampleComm: Communication = {
      id: 'comm-1',
      levhaNo: 'T091014-SAN3',
      acenteAdi: 'Test Acente',
      type: 'Telefon',
      subject: 'Test konu',
      notes: 'Test iletişim',
      createdBy: 'Test User',
      createdAt: new Date().toISOString(),
    };

    it('should add and retrieve communications', async () => {
      const added = await addCommunication(sampleComm);
      expect(added).toBe(true);

      const comms = await getAllCommunications();
      expect(comms).toHaveLength(1);
      expect(comms[0].id).toBe('comm-1');
    });

    it('should get communications by agency', async () => {
      await addCommunication(sampleComm);
      await addCommunication({ ...sampleComm, id: 'comm-2', levhaNo: 'T091015-IST1' });

      const agencyComms = await getCommunicationsByAgency('T091014-SAN3');
      expect(agencyComms).toHaveLength(1);
      expect(agencyComms[0].levhaNo).toBe('T091014-SAN3');
    });
  });

  describe('Request Operations', () => {
    const sampleRequest: Request = {
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
    };

    it('should add and retrieve requests', async () => {
      const added = await addRequest(sampleRequest);
      expect(added).toBe(true);

      const requests = await getAllRequests();
      expect(requests).toHaveLength(1);
      expect(requests[0].id).toBe('req-1');
    });

    it('should update request', async () => {
      await addRequest(sampleRequest);

      const updatedRequest = { ...sampleRequest, status: 'Çözüldü' as const };
      const updated = await updateRequest(updatedRequest);
      expect(updated).toBe(true);

      const requests = await getAllRequests();
      expect(requests[0].status).toBe('Çözüldü');
    });

    it('should get requests by agency', async () => {
      await addRequest(sampleRequest);
      await addRequest({ ...sampleRequest, id: 'req-2', levhaNo: 'T091015-IST1' });

      const agencyRequests = await getRequestsByAgency('T091014-SAN3');
      expect(agencyRequests).toHaveLength(1);
      expect(agencyRequests[0].levhaNo).toBe('T091014-SAN3');
    });

    it('should get open requests only', async () => {
      await addRequest(sampleRequest);
      await addRequest({ ...sampleRequest, id: 'req-2', status: 'Çözüldü' });

      const openRequests = await getOpenRequests();
      expect(openRequests).toHaveLength(1);
      expect(openRequests[0].status).not.toBe('Çözüldü');
    });
  });

  describe('Dashboard Metrics', () => {
    it('should calculate dashboard metrics correctly', async () => {
      // Mock agencies
      mockStorage.set('@sigortaacentesi:agencies', JSON.stringify([
        { levhaNo: 'T1', isActive: 1 },
        { levhaNo: 'T2', isActive: 1 },
        { levhaNo: 'T3', isActive: 0 },
      ]));

      // Add visits
      const now = new Date();
      const visit1: Visit = {
        id: 'v1',
        levhaNo: 'T1',
        iletisimTuru: 'Ziyaret',
        isOrtagi: 'Mevcut Acente',
        acenteAdi: 'A1',
        kimleGorusuldu: 'Test Yetkili',
        gundem: 'Genel Performans',
        tarih: now.toISOString().split('T')[0],
        detayAciklama: 'Test',
        
        createdBy: 'User',
        createdAt: now.toISOString(),
      };
      await addVisit(visit1);

      // Add requests
      const request1: Request = {
        id: 'r1',
        levhaNo: 'T1',
        acenteAdi: 'A1',
        requestType: 'Talep',
        priority: 'Orta',
        status: 'Açık',
        subject: 'Test',
        description: 'Test',
        createdBy: 'User',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
      await addRequest(request1);

      const metrics = await getDashboardMetrics();

      expect(metrics.totalAgencies).toBe(3);
      expect(metrics.activeAgencies).toBe(2);
      expect(metrics.passiveAgencies).toBe(1);
      expect(metrics.totalVisitsThisWeek).toBe(1);
      expect(metrics.openRequests).toBe(1);
    });
  });
});
