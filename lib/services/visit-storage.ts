/**
 * Ziyaret, iletişim ve talep verileri için storage servisi
 * Backend PostgreSQL database kullanıyor (AsyncStorage yerine)
 */

import { createTRPCClient, httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import type { AppRouter } from '@/server/routers';
import { getApiBaseUrl } from '@/constants/oauth';
import * as Auth from '@/lib/_core/auth';
import type { Visit, Communication, Request, DashboardMetrics } from '../types/visit';

/**
 * Vanilla tRPC client for non-React contexts
 */
const vanillaTrpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${getApiBaseUrl()}/api/trpc`,
      transformer: superjson,
      async headers() {
        const token = await Auth.getSessionToken();
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
      fetch(url, options) {
        return fetch(url, {
          ...options,
          credentials: 'include',
        });
      },
    }),
  ],
});

// ============ ZİYARETLER ============

export async function getAllVisits(): Promise<Visit[]> {
  try {
    const visits = await vanillaTrpc.visits.getAll.query();
    // Convert database IDs to string format for compatibility
    return visits.map(v => ({
      ...v,
      id: String(v.id),
      dosyalar: v.dosyalar ? JSON.parse(v.dosyalar) : undefined,
    })) as any;
  } catch (error) {
    console.error('[VisitStorage] getAllVisits error:', error);
    return [];
  }
}

export async function addVisit(visit: Visit): Promise<boolean> {
  try {
    await vanillaTrpc.visits.add.mutate({
      iletisimTuru: visit.iletisimTuru,
      isOrtagi: visit.isOrtagi,
      levhaNo: visit.levhaNo,
      acenteAdi: visit.acenteAdi,
      kimleGorusuldu: visit.kimleGorusuldu,
      tarih: visit.tarih,
      gundem: visit.gundem,
      detayAciklama: visit.detayAciklama,
      hatirlatma: visit.hatirlatma,
      hatirlatmaTarihi: visit.hatirlatmaTarihi,
      dosyalar: visit.dosyalar ? JSON.stringify(visit.dosyalar) : undefined,
      createdBy: visit.createdBy,
    });
    return true;
  } catch (error) {
    console.error('[VisitStorage] addVisit error:', error);
    return false;
  }
}

export async function getVisitsByAgency(levhaNo: string): Promise<Visit[]> {
  try {
    const visits = await vanillaTrpc.visits.getByAgency.query({ levhaNo });
    return visits.map(v => ({
      ...v,
      id: String(v.id),
      dosyalar: v.dosyalar ? JSON.parse(v.dosyalar) : undefined,
    })) as any;
  } catch (error) {
    console.error('[VisitStorage] getVisitsByAgency error:', error);
    return [];
  }
}

export async function getRecentVisits(count: number = 10): Promise<Visit[]> {
  try {
    const visits = await vanillaTrpc.visits.getRecent.query({ limit: count });
    return visits.map(v => ({
      ...v,
      id: String(v.id),
      dosyalar: v.dosyalar ? JSON.parse(v.dosyalar) : undefined,
    })) as any;
  } catch (error) {
    console.error('[VisitStorage] getRecentVisits error:', error);
    return [];
  }
}

export async function updateVisit(id: string, updates: Partial<Visit>): Promise<boolean> {
  try {
    await vanillaTrpc.visits.update.mutate({
      id: parseInt(id),
      data: {
        iletisimTuru: updates.iletisimTuru,
        isOrtagi: updates.isOrtagi,
        kimleGorusuldu: updates.kimleGorusuldu,
        tarih: updates.tarih,
        gundem: updates.gundem,
        detayAciklama: updates.detayAciklama,
        hatirlatma: updates.hatirlatma,
        hatirlatmaTarihi: updates.hatirlatmaTarihi,
        dosyalar: updates.dosyalar ? JSON.stringify(updates.dosyalar) : undefined,
      },
    });
    return true;
  } catch (error) {
    console.error('[VisitStorage] updateVisit error:', error);
    return false;
  }
}

export async function deleteVisit(id: string): Promise<boolean> {
  try {
    await vanillaTrpc.visits.delete.mutate({ id: parseInt(id) });
    return true;
  } catch (error) {
    console.error('[VisitStorage] deleteVisit error:', error);
    return false;
  }
}

// ============ İLETİŞİMLER ============

export async function getAllCommunications(): Promise<Communication[]> {
  try {
    const communications = await vanillaTrpc.communications.getAll.query();
    return communications.map(c => ({
      ...c,
      id: String(c.id),
    })) as any;
  } catch (error) {
    console.error('[VisitStorage] getAllCommunications error:', error);
    return [];
  }
}

export async function addCommunication(communication: Communication): Promise<boolean> {
  try {
    await vanillaTrpc.communications.add.mutate({
      levhaNo: communication.levhaNo,
      acenteAdi: communication.acenteAdi,
      type: communication.type,
      subject: communication.subject,
      notes: communication.notes,
      createdBy: communication.createdBy,
    });
    return true;
  } catch (error) {
    console.error('[VisitStorage] addCommunication error:', error);
    return false;
  }
}

// ============ TALEPLER ============

export async function getAllRequests(): Promise<Request[]> {
  try {
    const requests = await vanillaTrpc.requests.getAll.query();
    return requests.map(r => ({
      ...r,
      id: String(r.id),
      resolvedAt: r.resolvedAt ? r.resolvedAt.toISOString() : undefined,
    })) as any;
  } catch (error) {
    console.error('[VisitStorage] getAllRequests error:', error);
    return [];
  }
}

export async function getRecentRequests(count: number = 10): Promise<Request[]> {
  try {
    const requests = await vanillaTrpc.requests.getRecent.query({ limit: count });
    return requests.map(r => ({
      ...r,
      id: String(r.id),
      resolvedAt: r.resolvedAt ? r.resolvedAt.toISOString() : undefined,
    })) as any;
  } catch (error) {
    console.error('[VisitStorage] getRecentRequests error:', error);
    return [];
  }
}

export async function addRequest(request: Request): Promise<boolean> {
  try {
    await vanillaTrpc.requests.add.mutate({
      levhaNo: request.levhaNo,
      acenteAdi: request.acenteAdi,
      requestType: request.requestType,
      priority: request.priority,
      status: request.status,
      subject: request.subject,
      description: request.description,
      response: request.response,
      createdBy: request.createdBy,
    });
    return true;
  } catch (error) {
    console.error('[VisitStorage] addRequest error:', error);
    return false;
  }
}

export async function updateRequest(id: string, updates: Partial<Request>): Promise<boolean> {
  try {
    await vanillaTrpc.requests.update.mutate({
      id: parseInt(id),
      data: {
        status: updates.status,
        priority: updates.priority,
        response: updates.response,
        resolvedAt: updates.resolvedAt ? new Date(updates.resolvedAt) : undefined,
      },
    });
    return true;
  } catch (error) {
    console.error('[VisitStorage] updateRequest error:', error);
    return false;
  }
}

// ============ DASHBOARD METRİKLERİ ============

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  try {
    const metrics = await vanillaTrpc.dashboard.getMetrics.query();
    return {
      ...metrics,
      recentVisits: metrics.recentVisits.map(v => ({
        ...v,
        id: String(v.id),
        dosyalar: v.dosyalar ? JSON.parse(v.dosyalar) : undefined,
      })) as any,
      recentRequests: metrics.recentRequests.map(r => ({
        ...r,
        id: String(r.id),
        resolvedAt: r.resolvedAt ? r.resolvedAt.toISOString() : undefined,
      })) as any,
    };
  } catch (error) {
    console.error('[VisitStorage] getDashboardMetrics error:', error);
    return {
      totalAgencies: 0,
      activeAgencies: 0,
      passiveAgencies: 0,
      totalVisitsThisWeek: 0,
      totalVisitsThisMonth: 0,
      newAgenciesThisMonth: 0,
      openRequests: 0,
      recentVisits: [],
      recentRequests: [],
    };
  }
}
