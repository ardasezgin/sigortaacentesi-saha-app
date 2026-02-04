/**
 * Ziyaret ve iletişim için tip tanımlamaları
 */

export type VisitType = 'Fiziksel Ziyaret' | 'Telefon Araması';
export type RequestType = 'Talep' | 'İstek' | 'Şikayet';
export type RequestStatus = 'Açık' | 'Devam Ediyor' | 'Çözüldü';
export type Priority = 'Düşük' | 'Orta' | 'Yüksek';

/**
 * Ziyaret/Arama kaydı
 */
export interface Visit {
  id: string; // UUID
  levhaNo: string; // İlişkili acente
  acenteAdi: string; // Acente adı (denormalize edilmiş)
  visitType: VisitType; // Ziyaret türü
  visitDate: string; // ISO timestamp
  duration: number; // Süre (dakika)
  notes: string; // Ziyaret notları
  createdBy: string; // Oluşturan kullanıcı
  createdAt: string; // Oluşturma tarihi
}

/**
 * İletişim kaydı
 */
export interface Communication {
  id: string; // UUID
  levhaNo: string; // İlişkili acente
  acenteAdi: string; // Acente adı
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
  acenteAdi: string; // Acente adı
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
