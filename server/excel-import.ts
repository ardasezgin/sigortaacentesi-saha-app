import agenciesData from '../assets/agencies.json';
import * as db from './db';

/**
 * Excel'den parse edilen 19,364 acente kaydını PostgreSQL'e yükler
 * Bu fonksiyon server-side'da çalışır ve tüm cihazlar için ortak veri kaynağı oluşturur
 */
export async function importAgenciesFromExcel(): Promise<{
  success: boolean;
  count: number;
  message: string;
}> {
  try {
    console.log('[importAgenciesFromExcel] Başlatıldı');
    
    // Mevcut kayıt sayısını kontrol et
    const existingCount = await db.getAgencyCount();
    console.log(`[importAgenciesFromExcel] Mevcut kayıt sayısı: ${existingCount}`);
    
    if (existingCount > 0) {
      console.log('[importAgenciesFromExcel] Veriler zaten yüklü');
      return {
        success: true,
        count: existingCount,
        message: `Acente verileri zaten yüklü (${existingCount} kayıt)`,
      };
    }

    // JSON datasını database formatına dönüştür
    const agencies = agenciesData.map((item: any) => ({
      levhaNo: item.levhaNo,
      acenteTuru: item.acenteTuru || null,
      acenteUnvani: item.acenteUnvani,
      adres: item.adres || null,
      il: item.il || null,
      ilce: item.ilce || null,
      telefon: item.telefon || null,
      ePosta: item.eposta || null,
      teknikPersonel: item.teknikPersonel || null,
      levhaKayTar: item.levhaKayitTarihi || null,
      levhaYenKayTar: item.levhaYeniKayitTarihi || null,
      isActive: 1, // Default: active
      notlar: null,
    }));

    // Database'e bulk insert
    console.log(`[importAgenciesFromExcel] Database'e kaydediliyor: ${agencies.length} kayıt`);
    await db.bulkInsertAgencies(agencies);
    console.log('[importAgenciesFromExcel] Kaydetme başarılı');

    return {
      success: true,
      count: agencies.length,
      message: `${agencies.length} acente kaydı başarıyla PostgreSQL'e yüklendi`,
    };
  } catch (error) {
    console.error('[importAgenciesFromExcel] Hata:', error);
    return {
      success: false,
      count: 0,
      message: `Hata: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`,
    };
  }
}
