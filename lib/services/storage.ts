/**
 * AsyncStorage ile lokal veri yönetimi servisi
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Agency, AgencyLog } from '../types/agency';

const AGENCIES_KEY = '@sigortaacentesi:agencies';
const LOGS_KEY = '@sigortaacentesi:logs';

/**
 * Tüm acenteleri getir
 */
export async function getAllAgencies(): Promise<Agency[]> {
  try {
    const data = await AsyncStorage.getItem(AGENCIES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Acenteler yüklenirken hata:', error);
    return [];
  }
}

/**
 * Levha numarasına göre acente bul
 */
export async function getAgencyByLevhaNo(levhaNo: string): Promise<Agency | null> {
  try {
    const agencies = await getAllAgencies();
    return agencies.find(a => a.levhaNo === levhaNo) || null;
  } catch (error) {
    console.error('Acente aranırken hata:', error);
    return null;
  }
}

/**
 * Acente kaydet veya güncelle
 */
export async function saveAgency(agency: Agency): Promise<boolean> {
  try {
    const agencies = await getAllAgencies();
    const existingIndex = agencies.findIndex(a => a.levhaNo === agency.levhaNo);
    
    if (existingIndex >= 0) {
      // Güncelleme
      agencies[existingIndex] = agency;
    } else {
      // Yeni kayıt
      agencies.push(agency);
    }
    
    await AsyncStorage.setItem(AGENCIES_KEY, JSON.stringify(agencies));
    return true;
  } catch (error) {
    console.error('Acente kaydedilirken hata:', error);
    return false;
  }
}

/**
 * Birden fazla acente kaydet (Excel import için)
 */
export async function saveMultipleAgencies(agencies: Agency[]): Promise<boolean> {
  try {
    const existing = await getAllAgencies();
    const levhaNoMap = new Map(existing.map(a => [a.levhaNo, a]));
    
    // Yeni verileri mevcut verilerle birleştir (üzerine yaz)
    agencies.forEach(agency => {
      levhaNoMap.set(agency.levhaNo, agency);
    });
    
    const merged = Array.from(levhaNoMap.values());
    await AsyncStorage.setItem(AGENCIES_KEY, JSON.stringify(merged));
    return true;
  } catch (error) {
    console.error('Toplu acente kaydedilirken hata:', error);
    return false;
  }
}

/**
 * Tüm logları getir
 */
export async function getAllLogs(): Promise<AgencyLog[]> {
  try {
    const data = await AsyncStorage.getItem(LOGS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Loglar yüklenirken hata:', error);
    return [];
  }
}

/**
 * Yeni log kaydı ekle
 */
export async function addLog(log: AgencyLog): Promise<boolean> {
  try {
    const logs = await getAllLogs();
    logs.unshift(log); // En yeni kayıt başa
    await AsyncStorage.setItem(LOGS_KEY, JSON.stringify(logs));
    return true;
  } catch (error) {
    console.error('Log eklenirken hata:', error);
    return false;
  }
}

/**
 * Son N adet logu getir
 */
export async function getRecentLogs(count: number = 10): Promise<AgencyLog[]> {
  try {
    const logs = await getAllLogs();
    return logs.slice(0, count);
  } catch (error) {
    console.error('Son loglar yüklenirken hata:', error);
    return [];
  }
}

/**
 * Tüm verileri temizle (test amaçlı)
 */
export async function clearAllData(): Promise<boolean> {
  try {
    await AsyncStorage.multiRemove([AGENCIES_KEY, LOGS_KEY]);
    return true;
  } catch (error) {
    console.error('Veriler temizlenirken hata:', error);
    return false;
  }
}
