#!/bin/bash

# Aksiyon Saha Uygulaması - Deployment Script
# Bu script Docker Compose ile deployment'ı otomatikleştirir

set -e  # Exit on error

echo "🚀 Aksiyon Saha Uygulaması Deployment Başlıyor..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo -e "${RED}❌ .env.production dosyası bulunamadı!${NC}"
    echo ""
    echo "Lütfen .env.production.example dosyasını .env.production olarak kopyalayın ve düzenleyin:"
    echo "  cp .env.production.example .env.production"
    echo "  nano .env.production"
    exit 1
fi

# Load environment variables
export $(cat .env.production | grep -v '^#' | xargs)

# Check required environment variables
REQUIRED_VARS=("POSTGRES_PASSWORD" "CLICKUP_API_TOKEN" "SESSION_SECRET")
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}❌ Gerekli environment variable eksik: $var${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✅ Environment variables kontrol edildi${NC}"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker kurulu değil!${NC}"
    echo ""
    echo "Docker kurulumu için:"
    echo "  curl -fsSL https://get.docker.com -o get-docker.sh"
    echo "  sudo sh get-docker.sh"
    exit 1
fi

echo -e "${GREEN}✅ Docker kurulu${NC}"
echo ""

# Check if Docker Compose is installed
if ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose kurulu değil!${NC}"
    echo ""
    echo "Docker Compose kurulumu için:"
    echo "  sudo apt-get install docker-compose-plugin -y"
    exit 1
fi

echo -e "${GREEN}✅ Docker Compose kurulu${NC}"
echo ""

# Pull latest code (if git repo)
if [ -d .git ]; then
    echo -e "${YELLOW}📥 Git repository güncelleniyor...${NC}"
    git pull origin main || echo -e "${YELLOW}⚠️  Git pull başarısız, devam ediliyor...${NC}"
    echo ""
fi

# Stop existing containers
echo -e "${YELLOW}🛑 Mevcut container'lar durduruluyor...${NC}"
docker compose down || true
echo ""

# Build and start containers
echo -e "${YELLOW}🔨 Container'lar build ediliyor...${NC}"
docker compose build --no-cache
echo ""

echo -e "${YELLOW}▶️  Container'lar başlatılıyor...${NC}"
docker compose up -d
echo ""

# Wait for database to be ready
echo -e "${YELLOW}⏳ Database hazır olması bekleniyor...${NC}"
sleep 10

# Run database migrations
echo -e "${YELLOW}🗄️  Database migration çalıştırılıyor...${NC}"
docker compose exec -T app pnpm db:push || {
    echo -e "${RED}❌ Database migration başarısız!${NC}"
    echo ""
    echo "Logları kontrol edin:"
    echo "  docker compose logs app"
    exit 1
}
echo ""

# Check if containers are running
echo -e "${YELLOW}🔍 Container durumu kontrol ediliyor...${NC}"
docker compose ps
echo ""

# Health check
echo -e "${YELLOW}🏥 Health check yapılıyor...${NC}"
sleep 5

HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/trpc/system.health || echo "000")

if [ "$HEALTH_CHECK" = "200" ]; then
    echo -e "${GREEN}✅ Backend sağlıklı çalışıyor!${NC}"
else
    echo -e "${RED}❌ Backend health check başarısız! (HTTP $HEALTH_CHECK)${NC}"
    echo ""
    echo "Logları kontrol edin:"
    echo "  docker compose logs app"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 Deployment başarılı!${NC}"
echo ""
echo "Container'ları yönetmek için:"
echo "  docker compose ps       # Durum kontrol"
echo "  docker compose logs -f  # Logları izle"
echo "  docker compose restart  # Yeniden başlat"
echo "  docker compose down     # Durdur"
echo ""
echo "Backend URL: http://localhost:3000"
echo ""
echo "⚠️  Nginx ve SSL kurulumunu tamamlamayı unutmayın!"
echo "   README_DEPLOYMENT.md dosyasına bakın."
