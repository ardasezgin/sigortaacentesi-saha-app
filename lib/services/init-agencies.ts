import agenciesData from '../../assets/agencies.json';
import type { Agency } from '../types/agency';
import { agencyDB } from './indexeddb';

/**
 * Excel'den parse edilen 19,364 acente kaydını veritabanına yükler
 * Web: IndexedDB, Mobile: AsyncStorage
 * Bu fonksiyon sadece bir kez çalışır (initialization flag ile kontrol edilir)
 */
export async function initializeAgencies(): Promise<{
  success: boolean;
  count: number;
  message: string;
}> {
  try {
    console.log('[initializeAgencies] Başlatıldı');
    
    // Database'i başlat
    await agencyDB.init();
    
    // Daha önce yüklendi mi kontrol et
    const initialized = await agencyDB.isInitialized();
    console.log('[initializeAgencies] Initialized:', initialized);
    
    if (initialized) {
      const count = await agencyDB.count();
      console.log(`[initializeAgencies] Zaten yüklü, kayıt sayısı: ${count}`);
      return {
        success: true,
        count,
        message: 'Acente verileri zaten yüklü',
      };
    }

    // JSON datasını Agency tipine dönüştür
    const agencies: Agency[] = agenciesData.map((item: any) => ({
      id: item.id,
      acenteTuru: item.acenteTuru,
      levhaNo: item.levhaNo,
      levhaKayitTarihi: item.levhaKayitTarihi,
      levhaYenilemeTarihi: item.levhaYeniKayitTarihi || null,
      acenteUnvani: item.acenteUnvani,
      adres: item.adres,
      il: item.il,
      ilce: item.ilce,
      telefon: item.telefon,
      eposta: item.eposta,
      teknikPersonel: item.teknikPersonel,
    }));

    // Veritabanına kaydet
    console.log(`[initializeAgencies] Veritabanına kaydediliyor: ${agencies.length} kayıt`);
    await agencyDB.saveAgencies(agencies);
    console.log('[initializeAgencies] Kaydetme başarılı');

    return {
      success: true,
      count: agencies.length,
      message: `${agencies.length} acente kaydı başarıyla yüklendi`,
    };
  } catch (error) {
    console.error('Acente verileri yüklenirken hata:', error);
    return {
      success: false,
      count: 0,
      message: `Hata: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`,
    };
  }
}

/**
 * Levha numarasına göre acente ara
 * Hızlı arama için IndexedDB index kullanır
 */
export async function findAgencyByLevhaNo(levhaNo: string): Promise<Agency | null> {
  try {
    console.log('[findAgencyByLevhaNo] Aranan levha no:', levhaNo);
    
    const found = await agencyDB.findByLevhaNo(levhaNo);
    console.log(`[findAgencyByLevhaNo] Bulunan acente: ${found ? found.acenteUnvani : 'Bulunamadı'}`);
    
    return found;
  } catch (error) {
    console.error('Acente arama hatası:', error);
    return null;
  }
}

/**
 * Acente adına göre acente ara
 * Partial match (içerir) kullanır
 */
export async function findAgencyByName(name: string): Promise<Agency | null> {
  try {
    console.log('[findAgencyByName] Aranan acente adı:', name);
    
    const found = await agencyDB.findByName(name);
    console.log(`[findAgencyByName] Bulunan acente: ${found ? found.levhaNo : 'Bulunamadı'}`);
    
    return found;
  } catch (error) {
    console.error('Acente adı arama hatası:', error);
    return null;
  }
}

/**
 * Tüm acenteleri getir
 */
export async function getAllAgencies(): Promise<Agency[]> {
  try {
    return await agencyDB.getAll();
  } catch (error) {
    console.error('Acenteler getirilirken hata:', error);
    return [];
  }
}
