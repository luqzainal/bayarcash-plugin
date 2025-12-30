#!/bin/bash

# Script untuk test deployment secara local sebelum deploy ke Dokploy
# Run: chmod +x test-deployment.sh && ./test-deployment.sh
#
# IMPORTANT: Ini guna docker-compose.local.yml dengan ports yang berbeza
# untuk avoid conflict dengan Dokploy yang running di port 3000

echo "🧪 Testing BayarCash Deployment (Local)"
echo "========================================"
echo "Using docker-compose.local.yml with custom ports:"
echo "  - Backend:  Port 3001 (instead of 3000)"
echo "  - Frontend: Port 8080 (instead of 80)"
echo "  - MySQL:    Port 3307 (instead of 3306)"
echo "  - phpMyAdmin: Port 8081"
echo ""

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
docker compose -f docker-compose.local.yml down

echo -e "\n${YELLOW}2. Building images...${NC}"
docker compose -f docker-compose.local.yml build --no-cache

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi

echo -e "\n${YELLOW}3. Starting services...${NC}"
docker compose -f docker-compose.local.yml up -d

echo -e "\n${YELLOW}4. Waiting for services to be ready...${NC}"
sleep 10

echo -e "\n${YELLOW}5. Checking service health...${NC}"

# Check MySQL
echo -n "   MySQL: "
if docker exec bayarcash_mysql_local mysqladmin ping -h localhost --silent; then
    echo -e "${GREEN}✅ Running${NC}"
else
    echo -e "${RED}❌ Not running${NC}"
fi

# Check Backend
echo -n "   Backend: "
BACKEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health)
if [ "$BACKEND_HEALTH" = "200" ]; then
    echo -e "${GREEN}✅ Running (HTTP $BACKEND_HEALTH)${NC}"
else
    echo -e "${RED}❌ Not running (HTTP $BACKEND_HEALTH)${NC}"
fi

# Check Frontend
echo -n "   Frontend: "
FRONTEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080)
if [ "$FRONTEND_HEALTH" = "200" ]; then
    echo -e "${GREEN}✅ Running (HTTP $FRONTEND_HEALTH)${NC}"
else
    echo -e "${RED}❌ Not running (HTTP $FRONTEND_HEALTH)${NC}"
fi

echo -e "\n${YELLOW}6. Service URLs:${NC}"
echo "   Frontend:    http://localhost:8080"
echo "   Backend:     http://localhost:3001"
echo "   Health:      http://localhost:3001/health"
echo "   phpMyAdmin:  http://localhost:8081"

echo -e "\n${YELLOW}7. View logs:${NC}"
echo "   docker compose -f docker-compose.local.yml logs -f backend"
echo "   docker compose -f docker-compose.local.yml logs -f frontend"
echo "   docker compose -f docker-compose.local.yml logs -f mysql"

echo -e "\n${YELLOW}8. Stop services:${NC}"
echo "   docker compose -f docker-compose.local.yml down"

echo -e "\n${GREEN}✅ Deployment test complete!${NC}"
