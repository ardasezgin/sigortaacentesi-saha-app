# ClickUp OAuth Kurulum Rehberi

Bu dokümantasyon, uygulamanızda ClickUp OAuth entegrasyonunu nasıl kuracağınızı açıklar.

## Adım 1: ClickUp OAuth App Oluşturma

1. **ClickUp'a giriş yapın** (Workspace owner veya admin olmalısınız)
2. Sağ üst köşeden **avatar'ınıza** tıklayın
3. **Settings** seçeneğini seçin
4. Sol menüden **Apps** sekmesine gidin
5. **Create new app** butonuna tıklayın
6. Aşağıdaki bilgileri girin:
   - **App Name**: `Sigorta Acentesi Saha App`
   - **Redirect URL**: Aşağıdaki URL'lerden uygun olanı seçin:
     * **Production**: `https://your-domain.com/oauth/callback`
     * **Development (Web)**: `http://localhost:8081/oauth/callback`
     * **Development (Manus)**: Manus preview URL + `/oauth/callback`
     * **Native (iOS/Android)**: `sigortaacentesisaha://oauth/callback` (veya app.config.ts'deki scheme)

7. **Create** butonuna tıklayın
8. Size verilen **Client ID** ve **Client Secret** bilgilerini kaydedin

## Adım 2: Environment Variables Ayarlama

ClickUp OAuth credentials'larınızı güvenli bir şekilde saklamak için environment variables kullanın.

### Manus Environment'ta

Manus webdev platformunda secrets eklemek için:

```bash
# Manus UI'dan Settings → Secrets bölümüne gidin ve ekleyin:
CLICKUP_CLIENT_ID=your_client_id_here
CLICKUP_CLIENT_SECRET=your_client_secret_here
```

### Local Development için

Proje root'unda `.env` dosyası oluşturun:

```bash
CLICKUP_CLIENT_ID=your_client_id_here
CLICKUP_CLIENT_SECRET=your_client_secret_here
```

**ÖNEMLİ**: `.env` dosyasını `.gitignore`'a ekleyin!

## Adım 3: Redirect URI'yi Doğrulama

`lib/clickup-oauth.ts` dosyasındaki `getRedirectUri()` fonksiyonu otomatik olarak doğru redirect URI'yi oluşturur:

- **Web**: `window.location.origin + /oauth/callback`
- **Native**: App scheme + `://oauth/callback`

Eğer özel bir redirect URI kullanmak istiyorsanız, bu fonksiyonu düzenleyin.

## Adım 4: OAuth Flow Test Etme

### Web'de Test

1. Uygulamayı başlatın: `pnpm run dev`
2. Login ekranına gidin: `http://localhost:8081/login`
3. **"ClickUp ile Giriş Yap"** butonuna tıklayın
4. ClickUp authorization sayfasına yönlendirileceksiniz
5. Workspace seçin ve **Authorize** butonuna tıklayın
6. Callback URL'ye yönlendirileceksiniz: `/oauth/callback?code=...&state=...`
7. Uygulama otomatik olarak token exchange yapacak ve sizi dashboard'a yönlendirecek

### Native'de Test (iOS/Android)

1. Expo Go veya development build kullanarak uygulamayı başlatın
2. Login ekranında **"ClickUp ile Giriş Yap"** butonuna tıklayın
3. WebBrowser açılacak ve ClickUp authorization sayfasını gösterecek
4. Authorize ettikten sonra uygulama otomatik olarak callback'i handle edecek

## Adım 5: Production Deployment

Production'a deploy etmeden önce:

1. ✅ ClickUp OAuth app'inizde production redirect URI'yi ekleyin
2. ✅ Production environment variables'ları ayarlayın
3. ✅ HTTPS kullandığınızdan emin olun (ClickUp HTTP redirect URI'leri desteklemeyebilir)
4. ✅ OAuth flow'unu production URL'leriyle test edin

## OAuth Flow Diyagramı

```
┌─────────────┐
│   User      │
│  (Login)    │
└──────┬──────┘
       │ 1. "ClickUp ile Giriş Yap" butonuna tıklar
       ▼
┌─────────────────────────────────────────────────┐
│  App: startClickUpOAuth()                       │
│  → ClickUp authorization URL'sine yönlendir     │
└──────┬──────────────────────────────────────────┘
       │ 2. ClickUp'a yönlendirilir
       ▼
┌─────────────────────────────────────────────────┐
│  ClickUp Authorization Page                     │
│  → Kullanıcı workspace seçer ve authorize eder  │
└──────┬──────────────────────────────────────────┘
       │ 3. Callback URL'ye yönlendirilir (code + state)
       ▼
┌─────────────────────────────────────────────────┐
│  App: /oauth/callback                           │
│  → Code'u yakalayıp token exchange yapar        │
│  → Access token'ı saklar                        │
│  → User info'yu alır                            │
└──────┬──────────────────────────────────────────┘
       │ 4. Dashboard'a yönlendirilir
       ▼
┌─────────────┐
│  Dashboard  │
│  (Logged In)│
└─────────────┘
```

## Güvenlik Notları

1. **Client Secret'ı asla client-side kodda saklamayın**
   - Token exchange işlemini backend'de yapın
   - Şu an `lib/clickup-oauth.ts` içinde client-side exchange var (sadece demo için)
   - Production'da backend endpoint kullanın

2. **State parametresini doğrulayın**
   - CSRF saldırılarını önlemek için state parametresi kullanılıyor
   - Callback'te state'i doğrulamayı unutmayın

3. **HTTPS kullanın**
   - Production'da mutlaka HTTPS kullanın
   - ClickUp gelecekte HTTP redirect URI'leri desteklemeyebilir

## Sorun Giderme

### "Invalid redirect URI" hatası

- ClickUp OAuth app'inizde kayıtlı redirect URI ile kodda kullanılan URI'nin tam olarak eşleştiğinden emin olun
- Trailing slash (`/`) farkına dikkat edin

### "Invalid client_id" hatası

- Environment variables'ların doğru yüklendiğinden emin olun
- Client ID'yi kontrol edin (boşluk, özel karakter olmamalı)

### Token exchange başarısız

- Client Secret'ın doğru olduğundan emin olun
- Network isteklerini console'da kontrol edin
- ClickUp API rate limit'lerine dikkat edin

### Native'de WebBrowser açılmıyor

- `expo-web-browser` paketinin yüklü olduğundan emin olun
- iOS'ta Universal Links yapılandırması gerekebilir
- Android'de intent filters yapılandırması gerekebilir

## Referanslar

- [ClickUp OAuth Documentation](https://developer.clickup.com/docs/authentication)
- [ClickUp API Reference](https://developer.clickup.com/reference)
- [Expo WebBrowser](https://docs.expo.dev/versions/latest/sdk/webbrowser/)
- [OAuth 2.0 Simplified](https://aaronparecki.com/oauth-2-simplified/)

## Destek

Sorunlarla karşılaşırsanız:
1. Console loglarını kontrol edin (`[ClickUp OAuth]` prefix'li)
2. Network tab'ında API isteklerini inceleyin
3. ClickUp OAuth app ayarlarını doğrulayın
4. Bu dokümantasyonu tekrar gözden geçirin
