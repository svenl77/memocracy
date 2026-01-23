#!/bin/bash

# Memocracy Deployment Script for Cloudways
# This script automates the deployment process

set -e  # Exit on error

echo "🚀 Starting Memocracy Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    echo "Please create .env file from env.production.example"
    exit 1
fi

echo -e "${GREEN}✅ .env file found${NC}"

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version 18+ required. Current: $(node --version)${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js version OK: $(node --version)${NC}"

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install --production

# Generate Prisma Client
echo -e "${YELLOW}🔧 Generating Prisma Client...${NC}"
npx prisma generate

# Run database migrations
echo -e "${YELLOW}🗄️  Running database migrations...${NC}"
npx prisma migrate deploy

# Build application
echo -e "${YELLOW}🏗️  Building application...${NC}"
npm run build

# Check if build succeeded
if [ ! -d ".next" ]; then
    echo -e "${RED}❌ Build failed! .next directory not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build successful!${NC}"

# Set correct permissions
echo -e "${YELLOW}🔐 Setting file permissions...${NC}"
chmod -R 755 .
chmod 600 .env 2>/dev/null || true

echo -e "${GREEN}✅ Deployment preparation complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Start the application: pm2 start npm --name 'memocracy' -- start"
echo "2. Or restart if already running: pm2 restart memocracy"
echo "3. Check logs: pm2 logs memocracy"
echo "4. Check status: pm2 status"
