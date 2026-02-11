# Sigorta Acentesi Saha Uygulaması - TODO

## Tamamlanan Özellikler

- [x] Proje yapısı ve temel kurulum
- [x] Acente listesi ve detay ekranları
- [x] Ziyaret kayıt ve takip sistemi
- [x] Geçmiş ziyaretler ve raporlama
- [x] Excel import/export özellikleri
- [x] Drawer navigasyon yapısı
- [x] TypeScript tip hataları düzeltildi
- [x] Eski projeden yeni projeye migration tamamlandı
- [x] Tüm bağımlılıklar yüklendi ve TypeScript kontrolleri başarılı
- [x] Unit testler başarıyla çalıştı (23 test passed)
- [x] Dev server ve API server çalışıyor

## Sonraki Adımlar

- [x] GitHub'a push işlemi
- [ ] Kullanıcı testleri

## Yeni Özellikler

- [x] Login ekranı tasarımı ve UI
- [x] Authentication flow entegrasyonu
- [x] Login ekranı testleri

## ClickUp OAuth Entegrasyonu

- [x] ClickUp OAuth provider'ı yapılandır
- [x] Login ekranına "ClickUp ile Giriş Yap" butonu ekle
- [x] OAuth callback flow'unu test et
- [x] ClickUp OAuth app oluştur ve credentials ekle

## Bugfix

- [x] ClickUp OAuth login çalışmıyor - sorunu tespit et ve düzelt (credentials eklendi)

## Merkezi ClickUp Token Sistemi

- [x] OAuth butonunu kaldır
- [x] Merkezi ClickUp Personal API Token ekle
- [x] ClickUp servisini merkezi token ile güncelle
- [x] Test et (41 test başarılı, ClickUp API bağlantısı çalışıyor)

## Geçici Login Bypass (Ekran Görüntüsü İçin)

- [x] Login ekranını geçici olarak bypass et
- [x] Dashboard'a direkt erişim sağla
- [x] Test et

## Acente Verileri Sorunu

- [x] Acente verilerinin nerede saklandığını tespit et (assets/agencies.json + IndexedDB/AsyncStorage)
- [x] Kaybolmuş verileri geri yükle veya yeniden ekle (forceReloadAgencies butonu eklendi)
- [x] Test et

## Kalıcı Database Yükleme

- [x] Acenteleri PostgreSQL'e yükle (seed script çalıştırıldı)
- [x] Backend API'den çekmeye geç
- [x] Yükleme butonunu kaldır
- [x] Test et (TypeScript 0 hata)
