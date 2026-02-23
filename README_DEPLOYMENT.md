# Aksiyon Saha Uygulaması - Production Sunucu Kurulum Rehberi

**Versiyon:** 1.0  
**Tarih:** 23 Şubat 2026  
**Hazırlayan:** Arda Sezgin

---

## İçindekiler

1. [Sunucu Gereksinimleri](#sunucu-gereksinimleri)
2. [Kurulum Yöntemleri](#kurulum-yöntemleri)
3. [Docker ile Kurulum (Önerilen)](#docker-ile-kurulum-önerilen)
4. [Manuel Kurulum](#manuel-kurulum)
5. [SSL Sertifikası Kurulumu](#ssl-sertifikası-kurulumu)
6. [Environment Variables](#environment-variables)
7. [Database Migration](#database-migration)
8. [Deployment Sonrası Testler](#deployment-sonrası-testler)
9. [Bakım ve Monitoring](#bakım-ve-monitoring)
10. [Sorun Giderme](#sorun-giderme)

---

## Sunucu Gereksinimleri

### Minimum Gereksinimler (Test/Geliştirme)

| Bileşen | Gereksinim |
|---------|------------|
| **İşletim Sistemi** | Ubuntu 24.04 LTS veya 22.04 LTS |
| **CPU** | 1 vCore |
| **RAM** | 1 GB |
| **Disk** | 10 GB SSD |
| **Bant Genişliği** | 1 TB/ay |

### Önerilen Gereksinimler (Production)

| Bileşen | Gereksinim |
|---------|------------|
| **İşletim Sistemi** | Ubuntu 24.04 LTS |
| **CPU** | 2 vCore |
| **RAM** | 2 GB |
| **Disk** | 20 GB SSD |
| **Bant Genişliği** | Sınırsız veya 2 TB/ay |

### Yazılım Gereksinimleri

- **Node.js:** v22.13.0 (LTS)
- **PostgreSQL:** v16.x (veya v14+)
- **pnpm:** v9.12.0
- **Docker:** v24+ (opsiyonel, önerilen)
- **Docker Compose:** v2+ (opsiyonel, önerilen)
- **Nginx:** v1.24+ (reverse proxy için)
- **Certbot:** v2+ (SSL için)

### Network Gereksinimleri

**Açık Portlar:**
- **Port 80** (HTTP) - Nginx için
- **Port 443** (HTTPS) - SSL için
- **Port 3000** (Backend API) - Nginx'in proxy yapacağı port (dışarıya kapalı olabilir)

**Domain/SSL:**
- Domain veya subdomain (örn: `api.sigortaacentesi.com`)
- SSL sertifikası (Let's Encrypt ücretsiz)

---

## Kurulum Yöntemleri

İki farklı kurulum yöntemi sunulmaktadır:

### 1. Docker ile Kurulum (Önerilen)
- ✅ Kolay ve hızlı kurulum (10-15 dakika)
- ✅ Tüm bağımlılıklar container içinde
- ✅ Tutarlı çalışma ortamı
- ✅ Kolay güncelleme ve rollback
- ✅ Production-ready

### 2. Manuel Kurulum
- ⚠️ Daha fazla kontrol
- ⚠️ Daha uzun kurulum süresi (30-60 dakika)
- ⚠️ Sistem bağımlılıklarını manuel yönetme

---

## Docker ile Kurulum (Önerilen)

### Adım 1: Sunucuya Bağlanın

```bash
ssh ubuntu@YOUR_SERVER_IP
```

### Adım 2: Docker ve Docker Compose Kurun

```bash
# Docker kurulumu
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Docker Compose kurulumu
sudo apt-get update
sudo apt-get install docker-compose-plugin -y

# Docker'ı sudo olmadan çalıştırma
sudo usermod -aG docker $USER
newgrp docker

# Kurulumu doğrulayın
docker --version
docker compose version
```

### Adım 3: Proje Dosyalarını İndirin

```bash
# GitHub'dan klonlayın
git clone https://github.com/ardasezgin/sigortaacentesi-saha-app.git
cd sigortaacentesi-saha-app

# Veya deployment dosyalarını manuel olarak yükleyin
# (Bu durumda Dockerfile, docker-compose.yml, vb. dosyaları sunucuya kopyalayın)
```

### Adım 4: Environment Variables Ayarlayın

```bash
# .env.production dosyasını oluşturun
cp .env.example .env.production

# Dosyayı düzenleyin
nano .env.production
```

**Gerekli environment variables:**

```bash
# Node environment
NODE_ENV=production

# Database
DATABASE_URL=postgresql://aksiyon_user:STRONG_PASSWORD@db:5432/aksiyon_db

# Server
PORT=3000
HOST=0.0.0.0

# ClickUp API
CLICKUP_API_TOKEN=your_clickup_personal_token_here

# Session Secret (güçlü bir random string)
SESSION_SECRET=your_strong_random_secret_here

# Domain (SSL için)
DOMAIN=api.sigortaacentesi.com
```

**Güvenli şifre oluşturma:**

```bash
# Random password oluştur
openssl rand -base64 32

# Random session secret oluştur
openssl rand -hex 64
```

### Adım 5: Docker Compose ile Başlatın

```bash
# Container'ları oluştur ve başlat
docker compose up -d

# Logları izleyin
docker compose logs -f

# Çalışan container'ları kontrol edin
docker compose ps
```

### Adım 6: Database Migration Çalıştırın

```bash
# Migration container'ı çalıştır
docker compose exec app pnpm db:push

# Başarı mesajını bekleyin
```

### Adım 7: Nginx Reverse Proxy Kurun

```bash
# Nginx kur
sudo apt-get update
sudo apt-get install nginx -y

# Nginx config dosyası oluştur
sudo nano /etc/nginx/sites-available/aksiyon
```

**Nginx configuration:**

```nginx
server {
    listen 80;
    server_name api.sigortaacentesi.com;

    # Let's Encrypt challenge için
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Diğer tüm istekleri HTTPS'e yönlendir
    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name api.sigortaacentesi.com;

    # SSL sertifikaları (Let's Encrypt tarafından oluşturulacak)
    ssl_certificate /etc/letsencrypt/live/api.sigortaacentesi.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.sigortaacentesi.com/privkey.pem;

    # SSL ayarları
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Reverse proxy
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout ayarları
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Client max body size (form uploads için)
    client_max_body_size 10M;
}
```

**Nginx'i aktifleştirin:**

```bash
# Symlink oluştur
sudo ln -s /etc/nginx/sites-available/aksiyon /etc/nginx/sites-enabled/

# Default site'ı kaldır (opsiyonel)
sudo rm /etc/nginx/sites-enabled/default

# Config'i test et
sudo nginx -t

# Nginx'i yeniden başlat
sudo systemctl restart nginx
```

### Adım 8: SSL Sertifikası Kurun

```bash
# Certbot kur
sudo apt-get install certbot python3-certbot-nginx -y

# SSL sertifikası al
sudo certbot --nginx -d api.sigortaacentesi.com

# Otomatik yenileme testi
sudo certbot renew --dry-run
```

### Adım 9: Test Edin

```bash
# Health check
curl https://api.sigortaacentesi.com/api/trpc/system.health

# Beklenen çıktı:
# {"result":{"data":{"json":{"status":"ok","timestamp":"2026-02-23T..."}}}}
```

---

## Manuel Kurulum

### Adım 1: Node.js Kurun

```bash
# Node.js 22.x repository ekle
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -

# Node.js kur
sudo apt-get install -y nodejs

# pnpm kur
sudo npm install -g pnpm@9.12.0

# Kurulumu doğrula
node --version  # v22.13.0
pnpm --version  # 9.12.0
```

### Adım 2: PostgreSQL Kurun

```bash
# PostgreSQL 16 repository ekle
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -

# PostgreSQL kur
sudo apt-get update
sudo apt-get install postgresql-16 -y

# PostgreSQL başlat
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Adım 3: Database Oluşturun

```bash
# PostgreSQL kullanıcısına geç
sudo -u postgres psql

# Database ve user oluştur
CREATE DATABASE aksiyon_db;
CREATE USER aksiyon_user WITH ENCRYPTED PASSWORD 'STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE aksiyon_db TO aksiyon_user;
\q
```

### Adım 4: Proje Dosyalarını İndirin

```bash
# Ana dizine gidin
cd /home/ubuntu

# GitHub'dan klonlayın
git clone https://github.com/ardasezgin/sigortaacentesi-saha-app.git
cd sigortaacentesi-saha-app

# Bağımlılıkları yükleyin
pnpm install
```

### Adım 5: Environment Variables Ayarlayın

```bash
# .env.production dosyası oluşturun
nano .env.production
```

**İçerik:**

```bash
NODE_ENV=production
DATABASE_URL=postgresql://aksiyon_user:STRONG_PASSWORD@localhost:5432/aksiyon_db
PORT=3000
HOST=0.0.0.0
CLICKUP_API_TOKEN=your_clickup_personal_token_here
SESSION_SECRET=your_strong_random_secret_here
```

### Adım 6: Build Alın

```bash
# Production build
pnpm build

# Build çıktısını kontrol edin
ls -la dist/
```

### Adım 7: Database Migration Çalıştırın

```bash
# Migration
pnpm db:push

# Başarı mesajını bekleyin
```

### Adım 8: PM2 ile Process Management

```bash
# PM2 kur
sudo npm install -g pm2

# PM2 ecosystem dosyası oluştur
nano ecosystem.config.js
```

**ecosystem.config.js içeriği:**

```javascript
module.exports = {
  apps: [{
    name: 'aksiyon-api',
    script: 'dist/index.js',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    env_file: '.env.production',
    error_file: 'logs/error.log',
    out_file: 'logs/output.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
  }],
};
```

**PM2 başlatın:**

```bash
# Logs dizini oluştur
mkdir -p logs

# PM2 ile başlat
pm2 start ecosystem.config.js

# Durum kontrol
pm2 status

# Logs izle
pm2 logs

# Sistem başlangıcında otomatik başlat
pm2 startup
pm2 save
```

### Adım 9: Nginx ve SSL (Docker ile aynı)

Yukarıdaki "Docker ile Kurulum" bölümündeki Adım 7 ve 8'i takip edin.

---

## Environment Variables

### Zorunlu Variables

| Variable | Açıklama | Örnek |
|----------|----------|-------|
| `NODE_ENV` | Çalışma ortamı | `production` |
| `DATABASE_URL` | PostgreSQL bağlantı string'i | `postgresql://user:pass@host:5432/db` |
| `PORT` | Backend port | `3000` |
| `CLICKUP_API_TOKEN` | ClickUp Personal API Token | `pk_123...` |
| `SESSION_SECRET` | Session şifreleme anahtarı | `random_64_char_string` |

### Opsiyonel Variables

| Variable | Açıklama | Varsayılan |
|----------|----------|------------|
| `HOST` | Bind adresi | `0.0.0.0` |
| `LOG_LEVEL` | Log seviyesi | `info` |
| `CORS_ORIGIN` | CORS allowed origins | `*` |

---

## Database Migration

### İlk Kurulum

```bash
# Schema oluştur ve migrate et
pnpm db:push
```

### Mevcut Verileri Yükleme

Eğer mevcut bir database backup'ınız varsa:

```bash
# PostgreSQL dump'ı restore et
psql -U aksiyon_user -d aksiyon_db < backup.sql

# Veya Docker ile
docker compose exec db psql -U aksiyon_user -d aksiyon_db < backup.sql
```

---

## Deployment Sonrası Testler

### 1. Health Check

```bash
curl https://api.sigortaacentesi.com/api/trpc/system.health
```

**Beklenen çıktı:**
```json
{
  "result": {
    "data": {
      "json": {
        "status": "ok",
        "timestamp": "2026-02-23T..."
      }
    }
  }
}
```

### 2. Database Bağlantısı

```bash
# Docker ile
docker compose exec db psql -U aksiyon_user -d aksiyon_db -c "SELECT COUNT(*) FROM users;"

# Manuel kurulumda
psql -U aksiyon_user -d aksiyon_db -c "SELECT COUNT(*) FROM users;"
```

### 3. Login Test

```bash
curl -X POST https://api.sigortaacentesi.com/api/trpc/auth.login \
  -H "Content-Type: application/json" \
  -d '{"json":{"email":"test@demo.com","password":"123123123"}}'
```

### 4. iOS App Test

1. `EXPO_PUBLIC_API_BASE_URL` environment variable'ını güncelle:
   ```bash
   EXPO_PUBLIC_API_BASE_URL=https://api.sigortaacentesi.com
   ```

2. EAS Secret olarak ekle:
   ```bash
   npx eas-cli secret:create --scope project --name EXPO_PUBLIC_API_BASE_URL --value https://api.sigortaacentesi.com --type string
   ```

3. Yeni build al:
   ```bash
   npx eas-cli build --platform ios --profile production
   ```

4. TestFlight'a yükle ve test et

---

## Bakım ve Monitoring

### Log İzleme

**Docker ile:**
```bash
# Tüm loglar
docker compose logs -f

# Sadece app logları
docker compose logs -f app

# Son 100 satır
docker compose logs --tail=100 app
```

**PM2 ile:**
```bash
# Tüm loglar
pm2 logs

# Sadece error logları
pm2 logs --err

# Log dosyalarını temizle
pm2 flush
```

### Container/Process Yönetimi

**Docker:**
```bash
# Restart
docker compose restart

# Stop
docker compose stop

# Start
docker compose start

# Yeniden build ve başlat
docker compose up -d --build
```

**PM2:**
```bash
# Restart
pm2 restart aksiyon-api

# Stop
pm2 stop aksiyon-api

# Start
pm2 start aksiyon-api

# Reload (zero-downtime)
pm2 reload aksiyon-api
```

### Database Backup

```bash
# Backup oluştur
docker compose exec db pg_dump -U aksiyon_user aksiyon_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Manuel kurulumda
pg_dump -U aksiyon_user aksiyon_db > backup_$(date +%Y%m%d_%H%M%S).sql
```

**Otomatik backup (cron):**

```bash
# Crontab düzenle
crontab -e

# Her gün saat 02:00'de backup al
0 2 * * * cd /home/ubuntu/sigortaacentesi-saha-app && docker compose exec -T db pg_dump -U aksiyon_user aksiyon_db > backups/backup_$(date +\%Y\%m\%d_\%H\%M\%S).sql
```

### Güncelleme

**Docker ile:**
```bash
# Yeni kodu çek
git pull origin main

# Yeniden build ve başlat
docker compose up -d --build

# Migration çalıştır (gerekirse)
docker compose exec app pnpm db:push
```

**PM2 ile:**
```bash
# Yeni kodu çek
git pull origin main

# Bağımlılıkları güncelle
pnpm install

# Build al
pnpm build

# Migration çalıştır (gerekirse)
pnpm db:push

# Zero-downtime reload
pm2 reload aksiyon-api
```

---

## Sorun Giderme

### Problem: Container başlamıyor

**Çözüm:**
```bash
# Logları kontrol et
docker compose logs

# Container'ları yeniden oluştur
docker compose down
docker compose up -d --force-recreate
```

### Problem: Database bağlantı hatası

**Çözüm:**
```bash
# Database container'ının çalıştığını kontrol et
docker compose ps

# Database loglarını kontrol et
docker compose logs db

# DATABASE_URL'i kontrol et
docker compose exec app env | grep DATABASE_URL
```

### Problem: Nginx 502 Bad Gateway

**Çözüm:**
```bash
# Backend'in çalıştığını kontrol et
curl http://localhost:3000/api/trpc/system.health

# Nginx loglarını kontrol et
sudo tail -f /var/log/nginx/error.log

# Nginx config'i test et
sudo nginx -t
```

### Problem: SSL sertifikası hatası

**Çözüm:**
```bash
# Sertifika durumunu kontrol et
sudo certbot certificates

# Sertifikayı yenile
sudo certbot renew

# Nginx'i yeniden başlat
sudo systemctl restart nginx
```

### Problem: Yüksek memory kullanımı

**Çözüm:**
```bash
# Memory kullanımını kontrol et
docker stats

# PM2 ile memory limit ayarla
pm2 restart aksiyon-api --max-memory-restart 500M
```

---

## Güvenlik Önerileri

1. **Firewall Kurun:**
   ```bash
   sudo ufw allow 22/tcp
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```

2. **Fail2ban Kurun:**
   ```bash
   sudo apt-get install fail2ban -y
   sudo systemctl enable fail2ban
   sudo systemctl start fail2ban
   ```

3. **Otomatik Güvenlik Güncellemeleri:**
   ```bash
   sudo apt-get install unattended-upgrades -y
   sudo dpkg-reconfigure --priority=low unattended-upgrades
   ```

4. **SSH Key Authentication:**
   - Password authentication'u devre dışı bırakın
   - Sadece SSH key ile giriş yapın

5. **Environment Variables Güvenliği:**
   - `.env.production` dosyasını asla Git'e commit etmeyin
   - Güçlü şifreler kullanın
   - Session secret'ı düzenli olarak değiştirin

---

## Destek ve İletişim

Sorularınız için:
- **GitHub Issues:** https://github.com/ardasezgin/sigortaacentesi-saha-app/issues
- **Email:** sezginarda@yahoo.com

---

**Son Güncelleme:** 23 Şubat 2026  
**Döküman Versiyonu:** 1.0
