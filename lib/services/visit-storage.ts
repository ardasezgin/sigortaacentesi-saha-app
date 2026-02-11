/**
 * Ziyaret, iletişim ve talep verileri için storage servisi
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Visit, Communication, Request, DashboardMetrics } from '../types/visit';
import { getAllAgencies } from './storage';

const VISITS_KEY = '@sigortaacentesi:visits';
const COMMUNICATIONS_KEY = '@sigortaacentesi:communications';
const REQUESTS_KEY = '@sigortaacentesi:requests';

// ============ ZİYARETLER ============

export async function getAllVisits(): Promise<Visit[]> {
  try {
    const data = await AsyncStorage.getItem(VISITS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Ziyaretler yüklenirken hata:', error);
    return [];
  }
}

export async function addVisit(visit: Visit): Promise<boolean> {
  try {
    const visits = await getAllVisits();
    visits.unshift(visit); // En yeni kayıt başa
    await AsyncStorage.setItem(VISITS_KEY, JSON.stringify(visits));
    return true;
  } catch (error) {
    console.error('Ziyaret eklenirken hata:', error);
    return false;
  }
}

export async function getVisitsByAgency(levhaNo: string): Promise<Visit[]> {
  try {
    const visits = await getAllVisits();
    return visits.filter(v => v.levhaNo === levhaNo);
  } catch (error) {
    console.error('Acente ziyaretleri yüklenirken hata:', error);
    return [];
  }
}

export async function getRecentVisits(count: number = 10): Promise<Visit[]> {
  try {
    const visits = await getAllVisits();
    return visits.slice(0, count);
  } catch (error) {
    console.error('Son ziyaretler yüklenirken hata:', error);
    return [];
  }
}

// ============ İLETİŞİMLER ============

export async function getAllCommunications(): Promise<Communication[]> {
  try {
    const data = await AsyncStorage.getItem(COMMUNICATIONS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('İletişimler yüklenirken hata:', error);
    return [];
  }
}

export async function addCommunication(communication: Communication): Promise<boolean> {
  try {
    const communications = await getAllCommunications();
    communications.unshift(communication);
    await AsyncStorage.setItem(COMMUNICATIONS_KEY, JSON.stringify(communications));
    return true;
  } catch (error) {
    console.error('İletişim eklenirken hata:', error);
    return false;
  }
}

export async function getCommunicationsByAgency(levhaNo: string): Promise<Communication[]> {
  try {
    const communications = await getAllCommunications();
    return communications.filter(c => c.levhaNo === levhaNo);
  } catch (error) {
    console.error('Acente iletişimleri yüklenirken hata:', error);
    return [];
  }
}

// ============ TALEPLER ============

export async function getAllRequests(): Promise<Request[]> {
  try {
    const data = await AsyncStorage.getItem(REQUESTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Talepler yüklenirken hata:', error);
    return [];
  }
}

export async function addRequest(request: Request): Promise<boolean> {
  try {
    const requests = await getAllRequests();
    requests.unshift(request);
    await AsyncStorage.setItem(REQUESTS_KEY, JSON.stringify(requests));
    return true;
  } catch (error) {
    console.error('Talep eklenirken hata:', error);
    return false;
  }
}

export async function updateRequest(updatedRequest: Request): Promise<boolean> {
  try {
    const requests = await getAllRequests();
    const index = requests.findIndex(r => r.id === updatedRequest.id);
    
    if (index >= 0) {
      requests[index] = updatedRequest;
      await AsyncStorage.setItem(REQUESTS_KEY, JSON.stringify(requests));
      return true;
    }
    return false;
  } catch (error) {
    console.error('Talep güncellenirken hata:', error);
    return false;
  }
}

export async function getRequestsByAgency(levhaNo: string): Promise<Request[]> {
  try {
    const requests = await getAllRequests();
    return requests.filter(r => r.levhaNo === levhaNo);
  } catch (error) {
    console.error('Acente talepleri yüklenirken hata:', error);
    return [];
  }
}

export async function getOpenRequests(): Promise<Request[]> {
  try {
    const requests = await getAllRequests();
    return requests.filter(r => r.status !== 'Çözüldü');
  } catch (error) {
    console.error('Açık talepler yüklenirken hata:', error);
    return [];
  }
}

// ============ DASHBOARD METRİKLERİ ============

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  try {
    const agencies = await getAllAgencies();
    const visits = await getAllVisits();
    const requests = await getAllRequests();

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const totalAgencies = agencies.length;
    const activeAgencies = agencies.filter(a => a.isActive !== 0).length;
    const passiveAgencies = agencies.filter(a => a.isActive === 0).length;

    const totalVisitsThisWeek = visits.filter(
      v => new Date(v.tarih) >= weekAgo
    ).length;

    const totalVisitsThisMonth = visits.filter(
      v => new Date(v.tarih) >= monthAgo
    ).length;

    // Not: Yeni kayıt sayısı için AgencyLog'dan bakılabilir, şimdilik 0
    const newAgenciesThisMonth = 0;

    const openRequests = requests.filter(r => r.status !== 'Çözüldü').length;

    const recentVisits = visits.slice(0, 5);
    const recentRequests = requests.slice(0, 5);

    return {
      totalAgencies,
      activeAgencies,
      passiveAgencies,
      totalVisitsThisWeek,
      totalVisitsThisMonth,
      newAgenciesThisMonth,
      openRequests,
      recentVisits,
      recentRequests,
    };
  } catch (error) {
    console.error('Dashboard metrikleri yüklenirken hata:', error);
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
