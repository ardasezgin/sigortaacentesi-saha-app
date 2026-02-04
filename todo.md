# Sigortaacentesi Saha Ziyareti - TODO

## Tamamlanan Özellikler (v1)

- [x] Veritabanı şeması oluştur (acente bilgileri ve log tabloları)
- [x] AsyncStorage ile lokal veri yönetimi implementasyonu
- [x] Ana form ekranı tasarımı ve bileşenleri
- [x] Levha No input alanı ve otomatik arama fonksiyonu
- [x] Form alanlarının otomatik doldurulması mekanizması
- [x] Manuel düzenleme ve form validasyonu
- [x] Kaydet butonu ve veri kaydetme işlemi
- [x] Log bilgisi ile kayıt oluşturma (tarih, kullanıcı, işlem tipi)
- [x] Excel import ekranı ve dosya seçici
- [x] Excel parsing ve veri tabanına aktarma fonksiyonu
- [x] Geçmiş ziyaretler listesi (ana ekranda son 10 kayıt)
- [x] Geçmiş ekranı (tüm kayıtlar, filtreleme)
- [x] Tab navigasyonu (Ana Form, Veri Yönetimi, Geçmiş)
- [x] Başarı/hata mesajları ve haptic feedback
- [x] Uygulama logosu oluştur ve yapılandır
- [x] Tema renklerini güncelle (mavi primary color)
- [x] Test ve son kontroller

## Yeni Özellikler (v2 - Dashboard ve Menü Yapısı)

### Dashboard
- [x] Satış yöneticisi performans dashboard'u tasarımı
- [x] Performans metrikleri (ziyaret sayısı, yeni kayıt, güncelleme)
- [x] Grafik ve istatistikler (haftalık/aylık)
- [x] Özet kartlar (toplam acente, aktif/pasif durum)

### Navigasyon
- [x] Sol menü drawer navigasyonu implementasyonu
- [x] Menü açma/kapama animasyonları
- [x] Aktif menü item vurgulama

### Acentelerim Ekranı
- [x] Tüm acenteleri listeleme
- [x] Arama ve filtreleme (şehir, ilçe, durum)
- [x] Acente detay sayfası
- [ ] Acente düzenleme özelliği

### Ziyaret/Arama Girişi Ekranı
- [x] Ziyaret türü seçimi (fiziksel ziyaret / telefon araması)
- [x] Ziyaret formu (tarih, saat, notlar)
- [x] Acente seçimi (dropdown veya arama)
- [x] Ziyaret geçmişi

### Acente İletişimleri Ekranı
- [x] İletişim geçmişi listesi
- [x] Telefon arama entegrasyonu
- [x] E-posta gönderme özelliği
- [x] İletişim notları

### Talep/İstek/Şikayet Ekranı
- [x] Talep oluşturma formu
- [x] Talep kategorileri (Talep/İstek/Şikayet)
- [x] Öncelik seviyesi
- [x] Durum takibi (Açık/Devam Ediyor/Çözüldü)
- [x] Talep listesi ve detayları

### Genel İyileştirmeler
- [x] Drawer navigation için icon mappings
- [x] Yeni veri tipleri ve storage fonksiyonları
- [x] Unit testler (yeni özellikler için)

## ClickUp Entegrasyonu

### API Servisi
- [x] ClickUp API client oluştur
- [x] API token yönetimi (environment variable)
- [x] Workspace ve List ID yapılandırması
- [x] Task oluşturma fonksiyonu
- [x] Task güncelleme fonksiyonu
- [x] Task listeleme fonksiyonu
- [x] Hata yönetimi ve retry mekanizması

### Talep Entegrasyonu
- [x] Talep oluşturulduğunda ClickUp'ta task oluştur
- [ ] Talep durumu güncellendiğinde ClickUp task'ı güncelle
- [x] Öncelik seviyelerini ClickUp priority'ye map et
- [x] Talep kategorilerini ClickUp tag'lerine dönüştür

### Ziyaret Entegrasyonu
- [x] Ziyaret kaydedildiğinde ClickUp'ta task oluştur (opsiyonel)
- [x] Ziyaret notlarını task açıklamasına ekle
- [x] Ziyaret türünü tag olarak ekle

### Dashboard Entegrasyonu
- [x] ClickUp'taki açık görevleri dashboard'da göster
- [x] Senkronizasyon durumu göstergesi
- [ ] Manuel senkronizasyon butonu

### Ayarlar Ekranı
- [ ] ClickUp bağlantı durumu göstergesi
- [ ] API token girişi ve doğrulama
- [ ] Workspace ve List seçimi
- [ ] Otomatik senkronizasyon açma/kapama

### Test
- [x] ClickUp API servis testleri
- [x] Entegrasyon testleri
