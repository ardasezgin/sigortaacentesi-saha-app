import { createTRPCClient, httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import type { AppRouter } from '@/server/routers';
import { getApiBaseUrl } from '@/constants/oauth';
import * as Auth from '@/lib/_core/auth';
import type { Agency } from '../types/agency';

/**
 * Vanilla tRPC client for non-React contexts
 * (React components should use trpc hooks from lib/trpc.ts)
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

/**
 * Agency Service - Backend API ile iletişim
 * Artık tüm veriler PostgreSQL'de tutuluyor (IndexedDB/AsyncStorage yerine)
 */

export interface AgenciesPage {
  agencies: Agency[];
  total: number;
  hasMore: boolean;
}

/**
 * Acenteleri sayfalı olarak getir (backend'den) - mobil performans için
 */
export async function getAllAgencies(
  page: number = 1,
  limit: number = 50,
  search?: string
): Promise<AgenciesPage> {
  try {
    const result = await vanillaTrpc.agencies.getAll.query({ page, limit, search });
    return result as AgenciesPage;
  } catch (error) {
    console.error('[AgencyService] getAllAgencies error:', error);
    return { agencies: [], total: 0, hasMore: false };
  }
}

/**
 * Levha numarasına göre acente ara (backend'den)
 */
export async function findAgencyByLevhaNo(levhaNo: string): Promise<Agency | null> {
  try {
    const agency = await vanillaTrpc.agencies.findByLevhaNo.query({ levhaNo });
    return agency as Agency | null;
  } catch (error) {
    console.error('[AgencyService] findAgencyByLevhaNo error:', error);
    return null;
  }
}

/**
 * Acente adına göre acente ara (backend'den, partial match)
 */
export async function findAgencyByName(name: string): Promise<Agency | null> {
  try {
    const agency = await vanillaTrpc.agencies.findByName.query({ name });
    return agency as Agency | null;
  } catch (error) {
    console.error('[AgencyService] findAgencyByName error:', error);
    return null;
  }
}

/**
 * Acente ara (levha no, ad, il, ilçe)
 */
export async function searchAgencies(query: string): Promise<Agency[]> {
  try {
    const agencies = await vanillaTrpc.agencies.search.query({ query });
    return agencies as Agency[];
  } catch (error) {
    console.error('[AgencyService] searchAgencies error:', error);
    return [];
  }
}

/**
 * Acente güncelle (isActive, notlar)
 */
export async function updateAgency(
  levhaNo: string,
  data: { isActive?: number; notlar?: string }
): Promise<boolean> {
  try {
    await vanillaTrpc.agencies.update.mutate({ levhaNo, ...data });
    return true;
  } catch (error) {
    console.error('[AgencyService] updateAgency error:', error);
    return false;
  }
}

/**
 * Acente sayısını getir
 */
export async function getAgencyCount(): Promise<number> {
  try {
    const count = await vanillaTrpc.agencies.getCount.query();
    return count;
  } catch (error) {
    console.error('[AgencyService] getAgencyCount error:', error);
    return 0;
  }
}

/**
 * Excel'den acenteleri import et (server-side)
 * Bu fonksiyon sadece bir kez çalıştırılmalı
 */
export async function importAgenciesFromExcel(): Promise<{
  success: boolean;
  count: number;
  message: string;
}> {
  try {
    const result = await vanillaTrpc.agencies.importFromExcel.mutate();
    return result;
  } catch (error) {
    console.error('[AgencyService] importAgenciesFromExcel error:', error);
    return {
      success: false,
      count: 0,
      message: `Hata: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`,
    };
  }
}

/**
 * Acente karnesini getir (id ile)
 */
export async function getAgencyKarne(agencyId: number) {
  try {
    return await vanillaTrpc.agencies.getKarne.query({ agencyId });
  } catch (error) {
    console.error('[AgencyService] getAgencyKarne error:', error);
    return null;
  }
}

/**
 * Acente karnesi saha alanlarını kaydet
 */
export async function saveAgencyKarne(agencyId: number, data: Record<string, string | null | undefined>) {
  try {
    return await vanillaTrpc.agencies.saveKarne.mutate({ agencyId, ...data } as any);
  } catch (error) {
    console.error('[AgencyService] saveAgencyKarne error:', error);
    throw error;
  }
}
