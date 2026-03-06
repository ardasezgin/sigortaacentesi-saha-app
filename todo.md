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


## Real User Authentication (Backend Only)

- [x] Backend'e email/password validation ekle (bcrypt)
- [x] Hardcoded login'i kaldır
- [x] Demo hesap bilgileri kutusunu login sayfasından kaldır
- [x] Database schema güncellendi (passwordHash field)
- [x] findUserByEmail ve updateUserLastSignedIn fonksiyonları eklendi
- [x] CSV kullanıcıları ile test et (57 test başarılı, TypeScript 0 hata)
- [x] Checkpoint kaydet (3f3de4ff)


## Drawer Menu Updates

- [x] Drawer menüsüne "Çıkış Yap" butonu ekle (en alta)
- [x] Data Upload sayfasını drawer menüsünden gizle
- [x] Test et
- [x] Checkpoint kaydet (9066c45d)

## Logout Button Bug Fix

- [x] Çıkış yap butonu tepki vermiyor - sorunu tespit et (Drawer.Screen olarak eklendi)
- [x] Butonu düzelt ve çalışır hale getir (logout.tsx sayfası oluşturuldu)
- [x] Test et (57 test başarılı)
- [x] Checkpoint kaydet (1f813b92)

## Login Issue - Password Error

- [x] Database'deki kullanıcıları kontrol et (196 kullanıcı bulundu)
- [x] Şifre hash'lerini doğrula (Şifreler NULL idi, güncellendi)
- [x] Tüm kullanıcıların şifrelerini güncelle (Aksiyon2026)
- [x] Diğer domain kullanıcılarını sil (sadece @sigortaacentesi.com kaldı - 15 kullanıcı)
- [x] SDK session validation'u düzelt (hardcoded demo kaldırıldı)
- [x] getUserById() fonksiyonu eklendi
- [x] Login'i test et (57 test başarılı)
- [x] Checkpoint kaydet (0ec8a85b)

## Add New User

- [x] ardasezgin@rsotomotivgrubu.com kullanıcısını ekle (ID: 16)
- [x] Şifresini "Aksiyon2026" olarak ayarla (bcrypt hash)
- [x] Login testi yap (57 test başarılı)
- [x] Checkpoint kaydet (d369b15d)

## ClickUp User Sync & Auto-Assignment

- [x] User schema'da clickUpId alanını kontrol et (clickupUserId alanı mevcut)
- [x] ClickUp'tan tüm kullanıcıları çek (520 kullanıcı)
- [x] Database kullanıcıları ile email bazlı eşleştir (16/17 eşleşti)
- [x] ClickUp ID'leri database'e kaydet (başarılı)
- [x] Form gönderiminde otomatik assignee ayarla (visit.tsx güncellendi)
- [x] Test et (57 test başarılı)
- [x] Checkpoint kaydet (3517f285)

## Form Submission Bug

- [x] Console hatalarını kontrol et (hata yok, sessizce başarısız)
- [x] Backend loglarını kontrol et
- [x] Form submission kodunu debug et (createClickUpTask fetch yerine tRPC kullanmalı)
- [x] Hatayı düzelt (tRPC mutation kullanıldı)
- [x] Test et (57 test başarılı)
- [x] ClickUp başarı/hata mesajları eklendi
- [x] Alert yerine inline mesaj gösterimi eklendi (web uyumlu)
- [x] Kullanıcı ile test et (ClickUp'a başarıyla gönderdi)
- [x] Checkpoint kaydet (e79ffa82)

## Request/Complaint Form Fix

- [x] Talep/İstek/Şikayet formunu bul (requests.tsx)
- [x] tRPC mutation kullanacak şekilde güncelle
- [x] Inline başarı/hata mesajı ekle
- [x] useAuth ile giriş yapan kullanıcı bilgisi al
- [x] Test et (57 test başarılı)
- [ ] Kullanıcı ile test et
- [x] Checkpoint kaydet (e79ffa82)

## GitHub Push & TestFlight Deployment

- [x] GitHub repository kontrol et (https://github.com/ardasezgin/sigortaacentesi-saha-app.git)
- [x] Kodu GitHub'a push et (commit 994383b)
- [ ] iOS build yapılandırması hazırla
- [ ] TestFlight upload talimatları ver

## CRITICAL: Production Backend Deployment

- [ ] Mevcut API configuration'u kontrol et (app.config.ts, .env)
- [ ] Production backend'i kalıcı ortama deploy et (Manus Publish veya external hosting)
- [ ] App configuration'u production backend URL'i ile güncelle
- [ ] Yeni build al ve TestFlight'a yükle
- [ ] Production app'i test et (Manus kapalıyken çalışmalı)

## Test User Addition

- [x] Add test@demo.com user to database with password 123123123

## Build #15 - Updated Sandbox URL

- [x] Update EXPO_PUBLIC_API_BASE_URL with current sandbox URL
- [x] Build iOS app #15 with EAS
- [x] Download .ipa file
- [ ] User uploads to TestFlight via Transporter

## Build #16 - EAS Secret Fix

- [x] Add EXPO_PUBLIC_API_BASE_URL as EAS Secret
- [x] Build iOS app #16 with embedded environment variable
- [x] Download .ipa file
- [ ] User uploads to TestFlight via Transporter

## Production Server Deployment Documentation

- [x] Create comprehensive deployment guide (README_DEPLOYMENT.md)
- [x] Prepare Dockerfile for containerized deployment
- [x] Prepare docker-compose.yml for easy setup
- [x] Create nginx configuration for reverse proxy and SSL
- [x] Create deployment script (deploy.sh)
- [x] Create PM2 ecosystem config for process management
- [x] Create .env.production template
- [ ] Test deployment locally with Docker

## Production Issues (CRITICAL)
- [x] Import agency data to production database (19,364 records - match sandbox))
- [x] Fix logout button not showing in production app drawer menu (included in Build #18)

## Production Backend Update (CRITICAL)

- [x] Deploy updated backend code with agencies API endpoints to production
- [x] Restart PM2 process on production server
- [x] Verify agencies API returns 19,364 records

## iOS Build #18 with Logout Feature

- [ ] Push latest code to GitHub (includes logout feature)
- [ ] Build iOS version #18 with production backend
- [ ] Upload to TestFlight
- [ ] Test logout button in production app


## CRITICAL BUG - Build #18

- [ ] Agencies data not showing in Build #18 (backend API works, app code issue)
- [ ] Debug tRPC client configuration
- [ ] Check if auth token is being sent correctly
- [ ] Verify API base URL in production build

## Acenteler Ekranı Düzeltmeleri (Build #24)

- [x] Acenteler ekranı çökmesi düzeltildi (Build #23 uyumsuzluğu - yeni paginated API)
- [x] Arama tüm veritabanında çalışsın (sunucu tarafı, sayfalama ile uyumlu)
- [x] Sayfa numaraları tıklanabilir buton olarak Tümü/Aktif/Pasif altına eklendi

## Dashboard İstatistikleri Düzeltmesi

- [x] getDashboardMetrics count() MySQL/PostgreSQL uyumsuzluğu düzeltildi (doğrudan postgres-js bağlantısı ile)

## Kullanıcı Bulguları - Düzeltmeler

- [ ] Acentelerim sayfasında arama kutusunda klavye her harften sonra kapanıyor - düzeltilecek
- [ ] Arama kutusunda otomatik tamamlama (autocomplete) devre dışı bırakılacak
- [ ] Ziyaret/arama girişinde acente türü "Aday" veya "Mevcut" ise levha no zorunlu, diğerlerinde zorunlu değil
- [ ] Talep/istek/şikayet formunda "kimden" acenteden seçilirse acente seçimi isteğe bağlı olsun

## Performans Optimizasyonu

- [ ] Acentelerim sayfası yavaş yükleme sorunu - veritabanı index optimizasyonu

## ClickUp Entegrasyon Hatası

- [x] ClickUp entegrasyonu hatası: "Ziyaret kaydedildi ancak ClickUp'a gönderilemedi" uyarısı - Dernek/Komite seçilince oluşuyor - nedeni tespit et ve düzelt (ÇÖZÜM: Production sunucusunda CLICKUP_API_TOKEN env değişkeni eksikti, ecosystem.config.js'e eklendi ve PM2 yeniden başlatıldı)

## Sayfa2 Import + Acente Karnesi Ekranı

- [x] Production DB yedeği al
- [x] Sayfa2'deki 19.452 acente kaydını import et (mevcut datayı replace et)
- [x] DB schema'ya yeni alanları ekle (kurucuPersonel, kurulusTarihi, kurulusTarihiSacom, personelSayisi, subeMudurSayisi, organizasyoncu, subeSayisi, kacSirketleCalisiyor, acenteSegmenti, + 27 karne alanı)
- [x] Backend API'ye acente karnesi endpoint'leri ekle (getKarne, saveKarne)
- [x] Acente Karnesi ekranı oluştur (otomatik dolan + düzenlenebilir alanlar, combo box, % alanı, free text, çoklu seçim)
- [x] Acentelerim ekranından acente karnesi ekranına navigasyon ekle
- [x] Checkpoint al ve yeni build başlat (Build #28: 66ea3631-3448-43a6-aa14-3486965103a4)

## iOS Build #26

- [ ] EAS ile yeni iOS build al (tüm son düzeltmeleri içeriyor)
- [ ] IPA dosyasını indirip kullanıcıya teslim et

## Acente Karnesi Bug

- [x] "Karne verisi bulunamadı" hatası - ÇÖZÜM: agencyId yerine levhaNo kullanılacak şekilde değiştirildi (agencyId import sonrası değişiyor, levhaNo sabit)

## Acente Karnesi Düzenlenebilir Alan Düzeltmeleri

- [x] "Personel Sayısı" alanını düzenlenebilir yap (sayı alanı) - EDIT_FIELDS'a taşındı
- [x] "Organizasyoncu mu? Alt bayisi var mı?" alanını düzenlenebilir yap (combo box: Evet/Hayır/Bilmiyorum) - EDIT_FIELDS'a taşındı
- [x] "Şube Sayısı" alanını düzenlenebilir yap (sayı alanı) - EDIT_FIELDS'a taşındı

## Dışa Aktar Özelliği

- [x] Backend'e Excel export endpoint'i ekle (tüm acenteler + karne alanları, REST endpoint olarak) - /api/export/agencies
- [x] Acentelerim ekranına "Dışa Aktar" butonu ekle (arama kutusu yanına)
- [x] Export akışı: API'den CSV indir, expo-sharing ile paylaşım menüsünü aç
- [ ] Checkpoint al ve yeni build başlat

## Acente Karnesi Kaydetme Hataları (Build #32 Sonrası)

- [x] Sayı alanları (Personel Sayısı, Şube Sayısı) kaydedilmiyor - ÇÖZÜM: saveKarne router Zod şemasında personelSayisi, organizasyoncu, subeSayisi eksikti, eklendi
- [x] Export boş geliyor - Export endpoint zaten doğruydu, kaydetme sorunu çözülünce export da düzeldı
- [x] Karne ekranına tekrar girildiğinde son kaydedilen verinin gelmesi doğrulandı (test edildi: personelSayisi=42, subeSayisi=5, organizasyoncu=Evet)

## ClickUp Tekrarlayan Hata

- [x] "ClickUp'a gönderilemedi" hatası tekrar çıkıyor - ÇÖZÜM: Eski token geçersizdi + liste ID yanlıştı (901315064975 → 901814074449). Yeni token ve doğru liste ID ile production güncellendi.

## Acente Arama Seçim Hatası

- [x] Arama sonuçlarında ilk sıra dışındaki acenteye tıklanınca seçilmiyor - ÇÖZÜM: TouchableOpacity + map() yerine FlatList + Pressable + keyboardShouldPersistTaps="always" kullanıldı (visit.tsx + requests.tsx)

## Talep/İstek/Şikayet Kayıt Hatası

- [ ] "Kayıt sırasında bir hata oluştu" - Talep formu kaydedilemiyor, API hatası tespit et ve düzelt

## HT Talep Formu (Yeni)

- [x] ClickUp API token’ı yeni token ile güncelle (pk_101455294_XCCFOLJBLQ0S1FAS6RJXGJ2YL36TV5N6)
- [x] Backend'e ClickUp üye listesi endpoint'i ekle (getClickUpMembers)
- [x] Backend'e HT Talep Formu için createHtTask router'ı ekle (dosya yükleme + ClickUp)
- [x] HT Talep Formu sayfası oluştur (app/(drawer)/ht-talep.tsx)
- [x] Drawer navigasyona HT Talep Formu ekle
- [x] GitHub'a push et

## HT Talep Formu - Arama İyileştirmesi

- [x] Talebi Giren arama: 5 karakter girilince liste görünsün, daha az karakterde liste gizlensin

## HT Talep Formu - Karanlık Tema Düzeltmesi

- [x] ScrollView ve sayfa arka planı beyaz kalıyor, colors.background ile düzelt

## Tüm Sayfalarda Karanlık Tema Düzeltmesi

- [x] dashboard.tsx - ScrollView arka planı düzelt
- [x] visit.tsx - ScrollView arka planı düzelt
- [x] requests.tsx - ScrollView arka planı düzelt
- [x] agencies.tsx - ScrollView arka planı düzelt (ScreenContainer zaten bg-background, FlatList kullanıyor)
- [x] agency-karne.tsx - ScrollView arka planı düzelt
- [x] data-upload.tsx - ScrollView arka planı düzelt
- [x] GitHub'a push et

## Web Ön İzleme - Font Timeout Düzeltmesi

- [x] _layout.tsx'e useFonts ile MaterialIcons/Ionicons ön yükleme ekle (fontfaceobserver 6000ms timeout hatası)

## HT Talep Formu - Acente Arama

- [x] Acente Adı alanını arama yapılabilir dropdown'a çevir (diğer formlarla aynı pattern)
- [x] Levha No alanını acente seçimine bağla (acente seçilince otomatik dolsun)
