# Aksiyon - Saha Uygulaması

Sigorta acentesi saha çalışanları için mobil uygulama. Acente ziyaretlerini kaydetme, takip etme ve ClickUp ile entegre raporlama özellikleri sunar.

## Özellikler

- ✅ **19,364 Acente Kaydı**: PostgreSQL database'de kalıcı olarak saklanıyor
- ✅ **Otomatik Doldurma**: Levha no veya acente adının ilk 5 harfi ile otomatik form doldurma
- ✅ **Ziyaret Takibi**: Acente ziyaretlerini kaydetme ve geçmiş görüntüleme
- ✅ **ClickUp Entegrasyonu**: Ziyaretler otomatik olarak ClickUp'a task olarak ekleniyor
- ✅ **Talep/Şikayet Yönetimi**: Müşteri talep ve şikayetlerini kaydetme
- ✅ **Hardcoded Demo Login**: Sunum için test@demo.com / 123123123 ile hızlı giriş

## Teknolojiler

- **Framework**: Expo Router + React Native
- **Backend**: tRPC API + PostgreSQL (Drizzle ORM)
- **Authentication**: Hardcoded login (sunum için)
- **Entegrasyon**: ClickUp API (Personal Token)

## Kurulum

```bash
# Bağımlılıkları yükle
pnpm install

# Development server'ı başlat
pnpm dev

# Testleri çalıştır
pnpm test
```

## Demo Hesap

**Email**: test@demo.com  
**Şifre**: 123123123

## Son Güncellemeler (11 Şubat 2026)

- ✅ Hardcoded login sistemi eklendi (sunum için)
- ✅ 19,364 acente kaydı Excel'den PostgreSQL'e yüklendi
- ✅ Otomatik doldurma özellikleri tüm sayfalarda aktif
- ✅ ClickUp API entegrasyonu merkezi token ile çalışıyor
- ✅ 49 test başarılı

## Geliştirme Notları

Bu uygulama sunum amaçlı hardcoded login içermektedir. Production ortamında gerçek OAuth sistemi kullanılmalıdır.
