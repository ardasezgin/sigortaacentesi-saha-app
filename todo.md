# Aksiyon - Saha Uygulaması - TODO

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

## Veri Yükle Butonu Kaldırma ve ClickUp Login

- [x] Menüden veri yükle butonunu kaldır
- [x] ClickUp OAuth login'i aktif et (BYPASS_AUTH = false)
- [x] Test et (login ekranı görünüyor, 19,364 acente kaydı korundu)

## Sunum için Hardcoded Login

- [x] Login sayfasına test@demo.com / 123123123 hardcoded login ekle
- [x] Backend'e basit login endpoint ekle (hardcoded user döndürecek)
- [x] Session oluşturma ve auth guard entegrasyonu
- [x] Test et (49 test başarılı)

## Verileri PostgreSQL'e Taşıma ve Dashboard Güncelleme

- [x] Database schema'ya visits tablosu ekle
- [x] Database schema'ya communications tablosu ekle
- [x] Database schema'ya requests tablosu ekle
- [x] Backend API: visit CRUD endpoint'leri
- [x] Backend API: communication CRUD endpoint'leri
- [x] Backend API: request CRUD endpoint'leri
- [x] Backend API: dashboard metrics endpoint'i (aktif/pasif sayıları)
- [x] Frontend: visit-storage'ı backend API'ye bağla
- [x] Frontend: dashboard'ı backend API'ye bağla
- [x] Acente aktif/pasif güncelleme dashboard'da anlık yansısın
- [x] Migration çalıştır
- [x] Test et (50 test başarılı)

## Dashboard Aktif/Pasif Sayısı Güncelleme Sorunu

- [x] Dashboard'ın acente güncelleme sonrası yenilenmesini kontrol et
- [x] Acente pasife çekildiğinde dashboard sayılarının güncellenmesini sağla (useFocusEffect eklendi)
- [x] Test et (50 test başarılı)

## iOS TestFlight Deployment

- [x] Mevcut projenin checkpoint'ini al (güvenlik için) - checkpoint: 95d11754
- [x] EAS CLI kur ve yapılandır (v18.0.1)
- [x] eas.json konfigürasyon dosyası oluştur
- [x] Apple Developer hesabı bilgilerini al (sezginarda@yahoo.com)
- [ ] EAS ile Apple Developer hesabını bağla
- [ ] iOS production build oluştur
- [ ] Build'i TestFlight'a yükle
- [ ] TestFlight'ta test et
- [ ] Kullanıcılar için TestFlight davetiye talimatları hazırla

## Uygulama Adını "Aksiyon" Olarak Değiştir

- [x] app.config.ts'de appName'i "Aksiyon" yap
- [x] README.md'de uygulama adını güncelle
- [x] app/login.tsx'de başlığı güncelle
- [x] todo.md'de başlığı güncelle
- [x] Testleri çalıştır (49 test başarılı)
- [x] Checkpoint kaydet (c0f24549)

## ClickUp Personal Token Entegrasyonu (Seçenek 2)

- [x] ClickUp API Token environment variable ekle
- [x] ClickUp API client oluştur (server/services/clickup.ts)
- [x] ClickUp kullanıcılarını çek ve database'e sync et (clickup.syncUsers endpoint)
- [x] Email ile otomatik user eşleştirme (database clickupUserId field)
- [x] Form gönderiminde ClickUp task oluşturma (visit ve request formları)
- [x] Task'ları otomatik doğru kullanıcıya assign et (assigneeEmail parametresi)
- [x] Entegrasyonu end-to-end test et (57 test başarılı, 7 skipped)
- [ ] TestFlight'a yeni build yükle

## Backend URL Fix (Tamamlandı)

- [x] Production backend URL yapılandır
- [x] EAS Secret ekle (EXPO_PUBLIC_API_BASE_URL)
- [x] iOS app'i doğru backend URL ile rebuild et
- [x] TestFlight'a yükle
- [x] Login fonksiyonelliğini test et


## ClickUp User Sync Otomasyonu

- [x] İlk uygulama açılışında otomatik user sync çalışsın (dashboard.tsx'e eklendi)
- [x] Sync sonucu console'a loglanıyor
- [x] Sync durumu AsyncStorage'da saklanıp tekrar tekrar çalışmıyor

## GitHub Push

- [x] Tüm değişiklikler GitHub'a push edildi (8d9785f)


## Çıkış Yap Butonu

- [x] Drawer menüsünün en altına "Çıkış Yap" butonu ekle
- [x] Logout fonksiyonunu bağla (trpc.auth.logout)
- [x] Onay dialogı ekle
- [x] Test et (57 test başarılı)


## Çıkış Yap Butonu Bug

- [x] Çıkış yap butonu düzeltildi
- [x] Backend logout endpoint'i çağrılıyor (cookie temizleme)
- [x] Local session temizleniyor (Auth.removeSessionToken + clearUserInfo)
- [x] tRPC cache temizleniyor (utils.auth.me.reset)
- [x] Test et (57 test başarılı)


## Gerçek Kullanıcı Sistemi

- [x] Demo hesap bilgileri kutusunu login ekranından kaldır
- [x] Kullanıcı kaydı (sign up) ekranı oluştur (app/register.tsx)
- [x] Backend'e gerçek kullanıcı kaydı endpoint'i ekle (auth.register)
- [x] Backend'e gerçek kullanıcı girişi endpoint'i ekle (auth.login - email/şifre doğrulama)
- [x] Şifre hash'leme (bcrypt) ekle
- [x] Database schema güncellendi (passwordHash field)
- [x] Her kullanıcının emaili ile ClickUp kullanıcısı eşleşsin (email unique)
- [x] Test et (8 test başarılı - auth-register.test.ts)


## Bulk User Import

- [x] CSV dosyasını parse et (scripts/import-users.ts)
- [x] @sigortaacentesi.com kullanıcıları default şifre ile database'e kaydedildi
- [x] ClickUp user ID'leri CSV'den alınıp database'e kaydedildi
- [x] 14 kullanıcı zaten mevcut (daha önce import edilmiş)
- [x] Default şifre: Aksiyon2026
