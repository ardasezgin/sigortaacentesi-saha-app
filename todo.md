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

## Otomatik Doldurma Özelliği

- [x] Levha no ile acente bilgilerini otomatik doldur
- [x] Acente adının ilk 5 harfi ile arama yap
- [x] PostgreSQL'den çalışacak şekilde entegre et
- [x] Test et (44 test başarılı)

## Kritik Hatalar

- [x] Database'de 19,364 kayıt var ama uygulama 3,124 gösteriyor - düzelt (19,000 kayıt yüklendi)
- [x] Ziyaret/Arama sayfasında otomatik doldurma çalışmıyor - düzelt
- [x] Talep/İstek/Şikayet sayfasında otomatik doldurma çalışmıyor - düzelt

## API Limit Sorunu

- [x] Backend API sadece 1,269 kayıt döndürüyor (19,000 olmalı)
- [x] Limit'i kaldır veya pagination ekle (50,000 limit eklendi)
- [x] Test et

## Frontend Limit Sorunu

- [x] Frontend sadece 2,792 kayıt gösteriyor (19,000 olmalı)
- [x] Acenteler listesi kodunu kontrol et
- [x] Frontend limit/filter sorununu düzelt
- [x] Excel dosyasını doğru schema ile database'e yükle (19,364 kayıt başarılı)
