# Sigortaacentesi Saha Ziyareti - Mobil Uygulama Tasarımı

## Genel Bakış
Bu uygulama, sigorta acentesi saha satış personelinin acente ziyaretleri sırasında hızlı ve doğru veri girişi yapabilmesi için tasarlanmıştır. Uygulama, levha numarası girişi ile otomatik veri doldurma özelliğine sahiptir.

## Ekran Listesi

### 1. Ana Ekran (Home/Form Screen)
- **Amaç**: Acente bilgilerini girmek ve güncellemek
- **İçerik**: 
  - Levha No input alanı (otomatik tamamlama tetikleyici)
  - Acente bilgi formu (otomatik doldurulan alanlar)
  - Kaydet butonu
  - Geçmiş ziyaretler listesi (son 10 kayıt)

### 2. Veri Yönetimi Ekranı (Data Management)
- **Amaç**: Excel dosyasından acente verilerini içe aktarma
- **İçerik**:
  - Excel dosyası seçme butonu
  - İçe aktarılan kayıt sayısı göstergesi
  - Veri tabanı durumu bilgisi

### 3. Geçmiş Ekranı (History)
- **Amaç**: Tüm saha ziyaretlerini görüntüleme
- **İçerik**:
  - Tarih bazlı filtreleme
  - Ziyaret kayıtları listesi
  - Detay görüntüleme

## Temel Kullanıcı Akışları

### Ana Akış: Saha Ziyareti Kaydı
1. Kullanıcı uygulamayı açar → Ana ekran (Form) görünür
2. Levha No alanına "T091014-SAN3" yazar
3. Sistem veri tabanından eşleşen kaydı bulur
4. Form alanları otomatik doldurulur (Acente Adı, Yetkili, Telefon, vb.)
5. Kullanıcı gerekirse alanları manuel düzenler
6. "Kaydet" butonuna basar
7. Sistem kaydı log bilgisi ile birlikte veri tabanına yazar
8. Başarı mesajı gösterilir

### İkincil Akış: Excel Import
1. Kullanıcı "Veri Yönetimi" sekmesine geçer
2. "Excel İçe Aktar" butonuna basar
3. Dosya seçici açılır
4. Excel dosyası seçilir
5. Sistem dosyayı parse eder ve veri tabanına aktarır
6. Başarı mesajı ve import edilen kayıt sayısı gösterilir

## Form Alanları

### Otomatik Doldurulan Alanlar (Levha No girişi sonrası)
- **Levha No** (primary key, manuel giriş)
- **Acente Adı** (otomatik)
- **Yetkili Adı Soyadı** (otomatik)
- **Telefon** (otomatik)
- **E-posta** (otomatik)
- **Adres** (otomatik)
- **Şehir** (otomatik)
- **İlçe** (otomatik)
- **Vergi No** (otomatik)
- **Durum** (Aktif/Pasif - otomatik)

### Manuel Düzenlenebilir
Tüm otomatik doldurulan alanlar kullanıcı tarafından değiştirilebilir.

### Log Alanları (Otomatik)
- **Kayıt Tarihi** (timestamp)
- **Güncelleyen Kullanıcı** (sistem kullanıcısı)
- **İşlem Tipi** (Yeni/Güncelleme)

## Renk Paleti

### Ana Renkler
- **Primary (Mavi)**: `#0066CC` - Butonlar, vurgular, aktif durumlar
- **Background (Açık)**: `#F8F9FA` - Arka plan
- **Surface (Beyaz)**: `#FFFFFF` - Kartlar, form alanları
- **Foreground (Koyu)**: `#1A1A1A` - Ana metin
- **Muted (Gri)**: `#6C757D` - İkincil metin, placeholder
- **Border**: `#DEE2E6` - Çerçeveler, ayırıcılar
- **Success (Yeşil)**: `#28A745` - Başarılı işlemler
- **Warning (Turuncu)**: `#FFC107` - Uyarılar
- **Error (Kırmızı)**: `#DC3545` - Hatalar

## Tasarım İlkeleri

### iOS HIG Uyumluluğu
- **Tek el kullanımı**: Tüm önemli butonlar ekranın alt kısmında
- **Büyük dokunma alanları**: Minimum 44x44pt buton boyutları
- **Native hissi**: iOS standart bileşenler ve animasyonlar
- **Açık geri bildirim**: Her işlem sonrası haptic feedback ve görsel geri bildirim

### Mobil Portre Odaklı (9:16)
- Form alanları dikey scroll ile erişilebilir
- Tek sütun düzeni
- Büyük, okunabilir fontlar (minimum 16px body text)
- Yeterli padding ve spacing (minimum 16px)

## Özel Özellikler

### Otomatik Tamamlama Mekanizması
- Levha No alanında her karakter girişinde debounced search (300ms)
- Eşleşme bulunduğunda tüm form alanları anında güncellenir
- Kullanıcı manuel değişiklik yaparsa otomatik güncelleme devre dışı kalır
- "Sıfırla" butonu ile formu temizleme

### Offline Çalışma
- Tüm veriler lokal AsyncStorage'da saklanır
- İnternet bağlantısı olmadan çalışabilir
- Senkronizasyon gerekmez (lokal uygulama)

### Excel Import Formatı
Beklenen Excel sütun yapısı:
- A: Levha No
- B: Acente Adı
- C: Yetkili Adı Soyadı
- D: Telefon
- E: E-posta
- F: Adres
- G: Şehir
- H: İlçe
- I: Vergi No
- J: Durum (Aktif/Pasif)

## Teknik Notlar
- AsyncStorage kullanarak lokal veri saklama
- React Native Expo framework
- NativeWind (Tailwind CSS) ile styling
- TypeScript ile tip güvenliği
- Excel parsing için SheetJS/xlsx kütüphanesi
