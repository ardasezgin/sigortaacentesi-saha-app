/**
 * Ziyaret ve iletişim için tip tanımlamaları
 */

// İletişim Türü
export type CommunicationType = 'Arama' | 'Ziyaret' | 'Online Toplantı' | 'Fuar/Etkinlik';

// İş Ortağı
export type PartnerType = 
  | 'Aday Acente'
  | 'Mevcut Acente'
  | 'Sigorta Şirketi'
  | 'Dernek / Komite'
  | 'RS Grup Şirketleri'
  | 'Galeri'
  | 'Diğer';

// Gündem
export type AgendaType =
  | 'Yol Yardım Satış'
  | 'Yol Yardım Proje'
  | 'Genel Performans'
  | 'Hızlı Teklif Ekranları'
  | 'Müşteri Yönlendirme Projesi'
  | 'Diğer Teknoloji Konuları'
  | 'Acente Segmentasyon Konuları'
  | 'Aday Görüşmesi'
  | 'Tanışma Toplantısı'
  | 'Dernek / Komite Toplantısı'
  | 'Oto Konfor'
  | 'GOS'
  | 'Ekspertiz'
  | 'RS Hasar'
  | 'RS Boyasız Onarım'
  | 'Carshine'
  | 'İhale Portal'
  | 'RS Diğer Şirketler'
  | 'Diğer Gündemler';

export type RequestType = 'Talep' | 'İstek' | 'Şikayet';
export type RequestStatus = 'Açık' | 'Devam Ediyor' | 'Çözüldü';
export type Priority = 'Düşük' | 'Orta' | 'Yüksek';

/**
 * Ziyaret/Arama kaydı (Yeni yapı)
 */
export interface Visit {
  id: string; // UUID
  
  // Form alanları
  iletisimTuru: CommunicationType; // İletişim Türü
  isOrtagi: PartnerType; // İş Ortağı
  levhaNo: string; // Levha No
  acenteAdi: string; // Acente Adı (otomatik doldurulur)
  kimleGorusuldu: string; // Kimle Görüşüldü (yetkili adı)
  tarih: string; // Tarih (ISO date string)
  gundem: AgendaType; // Gündem
  detayAciklama: string; // Detay Açıklama
  hatirlatma?: string; // Hatırlatma (opsiyonel)
  hatirlatmaTarihi?: string; // Hatırlatma Tarihi (ISO date string, opsiyonel)
  dosyalar?: string[]; // Yüklenen dosya yolları (opsiyonel)
  
  // Metadata
  createdBy: string; // Oluşturan kullanıcı
  createdAt: string; // Oluşturma tarihi (ISO timestamp)
  updatedAt?: string; // Son güncelleme tarihi (opsiyonel)
}

/**
 * İletişim kaydı
 */
export interface Communication {
  id: string; // UUID
  levhaNo: string; // İlişkili acente
  acenteUnvani?: string; // Acente ünvanı (denormalize)
  acenteAdi?: string; // Acente adı
  type: 'Telefon' | 'E-posta' | 'WhatsApp' | 'Diğer';
  subject: string; // Konu
  notes: string; // İletişim detayları
  createdBy: string; // Oluşturan kullanıcı
  createdAt: string; // Oluşturma tarihi
}

/**
 * Talep/İstek/Şikayet kaydı
 */
export interface Request {
  id: string; // UUID
  levhaNo: string; // İlişkili acente
  acenteUnvani?: string; // Acente ünvanı (denormalize)
  acenteAdi?: string; // Acente adı
  requestType: RequestType; // Talep türü
  priority: Priority; // Öncelik
  status: RequestStatus; // Durum
  subject: string; // Konu başlığı
  description: string; // Detaylı açıklama
  response?: string; // Yanıt/Çözüm
  createdBy: string; // Oluşturan kullanıcı
  createdAt: string; // Oluşturma tarihi
  updatedAt: string; // Son güncelleme tarihi
  resolvedAt?: string; // Çözüm tarihi
}

/**
 * Dashboard metrikleri
 */
export interface DashboardMetrics {
  totalAgencies: number; // Toplam acente sayısı
  activeAgencies: number; // Aktif acente sayısı
  passiveAgencies: number; // Pasif acente sayısı
  totalVisitsThisWeek: number; // Bu hafta ziyaret sayısı
  totalVisitsThisMonth: number; // Bu ay ziyaret sayısı
  newAgenciesThisMonth: number; // Bu ay yeni kayıt sayısı
  openRequests: number; // Açık talep sayısı
  recentVisits: Visit[]; // Son ziyaretler
  recentRequests: Request[]; // Son talepler
}
