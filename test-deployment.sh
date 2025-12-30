#!/bin/bash

# Script untuk test deployment secara local sebelum deploy ke Dokploy
# Run: chmod +x test-deployment.sh && ./test-deployment.sh

echo "🧪 Testing BayarCash Deployment..."
echo "=================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo -e "${YELLOW}⚠️  .env.production tidak wujud. Copy dari .env.production.example${NC}"
    exit 1
fi

echo -e "\n${YELLOW}1. Stopping existing containers...${NC}"
docker-compose down

echo -e "\n${YELLOW}2. Building images...${NC}"
docker-compose build --no-cache

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi

echo -e "\n${YELLOW}3. Starting services...${NC}"
docker-compose --env-file .env.production up -d

echo -e "\n${YELLOW}4. Waiting for services to be ready...${NC}"
sleep 10

echo -e "\n${YELLOW}5. Checking service health...${NC}"

# Check MySQL
echo -n "   MySQL: "
if docker exec bayarcash_mysql mysqladmin ping -h localhost --silent; then
    echo -e "${GREEN}✅ Running${NC}"
else
    echo -e "${RED}❌ Not running${NC}"
fi

# Check Backend
echo -n "   Backend: "
BACKEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)
if [ "$BACKEND_HEALTH" = "200" ]; then
    echo -e "${GREEN}✅ Running (HTTP $BACKEND_HEALTH)${NC}"
else
    echo -e "${RED}❌ Not running (HTTP $BACKEND_HEALTH)${NC}"
fi

# Check Frontend
echo -n "   Frontend: "
FRONTEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:80)
if [ "$FRONTEND_HEALTH" = "200" ]; then
    echo -e "${GREEN}✅ Running (HTTP $FRONTEND_HEALTH)${NC}"
else
    echo -e "${RED}❌ Not running (HTTP $FRONTEND_HEALTH)${NC}"
fi

echo -e "\n${YELLOW}6. Service URLs:${NC}"
echo "   Frontend: http://localhost"
echo "   Backend:  http://localhost:3000"
echo "   Health:   http://localhost:3000/health"

echo -e "\n${YELLOW}7. View logs:${NC}"
echo "   docker-compose logs -f backend"
echo "   docker-compose logs -f frontend"
echo "   docker-compose logs -f mysql"

echo -e "\n${YELLOW}8. Stop services:${NC}"
echo "   docker-compose down"

echo -e "\n${GREEN}✅ Deployment test complete!${NC}"
