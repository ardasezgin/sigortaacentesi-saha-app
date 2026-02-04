/**
 * Acente bilgileri için tip tanımlamaları
 */

export interface Agency {
  levhaNo: string; // Primary key - Levha numarası (örn: T091014-SAN3)
  acenteAdi: string; // Acente adı
  yetkiliAdiSoyadi: string; // Yetkili adı soyadı
  telefon: string; // Telefon numarası
  eposta: string; // E-posta adresi
  adres: string; // Adres
  sehir: string; // Şehir
  ilce: string; // İlçe
  vergiNo: string; // Vergi numarası
  durum: 'Aktif' | 'Pasif'; // Durum
}

export interface AgencyLog {
  id: string; // Unique ID (UUID)
  levhaNo: string; // İlişkili levha numarası
  kayitTarihi: string; // ISO timestamp
  islemTipi: 'Yeni' | 'Güncelleme'; // İşlem tipi
  guncelleyenKullanici: string; // Kullanıcı adı (şimdilik sabit)
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
  errors: string[];
}
