/**
 * Acente bilgileri için tip tanımlamaları
 * Excel: KopyaAcenteListesi.xlsx (19,364 kayıt)
 */

export interface Agency {
  id?: number; // Database ID (auto-increment)
  // Excel sütunları
  acenteTuru?: string | null; // Acente Turu (TÜZEL/GERÇEK)
  levhaNo: string; // Primary key - Levha No (örn: G0866-5E2J)
  levhaKayTar?: string | null; // Levha Kay. Tar. (DD.MM.YYYY)
  levhaYenKayTar?: string | null; // Levha Yen. Kay. Tar. (opsiyonel)
  acenteUnvani: string; // Acente Ünvanı
  adres?: string | null; // Adres
  il?: string | null; // İl
  ilce?: string | null; // İlçe
  telefon?: string | null; // Telefon
  ePosta?: string | null; // E-Posta (database field name)
  teknikPersonel?: string | null; // Teknik Personel (çoklu personel bilgisi)
  
  // Uygulama için ek alanlar
  isActive?: number; // Aktif/Pasif durumu (1=active, 0=inactive)
  notlar?: string | null; // Ek notlar
  lastUpdated?: Date | null; // Son güncelleme tarihi
  createdAt?: Date; // Oluşturulma tarihi
  
  // Backward compatibility (deprecated fields)
  durum?: 'Aktif' | 'Pasif'; // @deprecated Use isActive (1=active, 0=inactive)
  levhaKayitTarihi?: string; // @deprecated Use levhaKayTar
  levhaYenilemeTarihi?: string | null; // @deprecated Use levhaYenKayTar
  eposta?: string; // @deprecated Use ePosta
}

export interface AgencyLog {
  id: string; // Unique ID (UUID)
  levhaNo: string; // İlişkili levha numarası
  kayitTarihi: string; // ISO timestamp
  islemTipi: 'Yeni' | 'Güncelleme' | 'Excel Import'; // İşlem tipi
  guncelleyenKullanici: string; // Kullanıcı adı
  oncekiVeri?: Partial<Agency>; // Güncelleme durumunda önceki veri
  yeniVeri: Agency; // Yeni/güncel veri
}

export interface AgencyFormData extends Omit<Agency, 'levhaNo'> {
  levhaNo: string;
}

export interface ExcelImportResult {
  success: boolean;
  importedCount: number;
  errorCount: number;
  skippedCount: number; // Boş veya geçersiz satırlar
  errors: string[];
  duration: number; // Import süresi (ms)
}

/**
 * PowerBI API için veri yapısı (Faz 2)
 */
export interface PowerBIDataset {
  id: string;
  name: string;
  tables: PowerBITable[];
}

export interface PowerBITable {
  name: string;
  rows: Agency[];
}

export interface PowerBISyncConfig {
  datasetId: string;
  tableName: string;
  lastSyncDate: string | null;
  autoSync: boolean;
  syncInterval: number; // dakika
}
