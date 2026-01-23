#!/bin/bash

# Memocracy - Remote Deployment Script
# Run this script ON THE SERVER after files are uploaded

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🚀 Starting Memocracy Deployment on Server...${NC}"

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    echo "Creating .env from template..."
    
    if [ -f env.production.example ]; then
        cp env.production.example .env
        echo -e "${YELLOW}⚠️  Please edit .env file with correct values:${NC}"
        echo "   nano .env"
        exit 1
    else
        echo -e "${RED}❌ env.production.example not found!${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✅ .env file found${NC}"

# Check Node.js version
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found!${NC}"
    echo "Installing Node.js via nvm..."
    
    # Install nvm
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    
    # Install Node.js 20
    nvm install 20
    nvm use 20
    nvm alias default 20
fi

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

# Test database connection
echo -e "${YELLOW}🗄️  Testing database connection...${NC}"
if npx prisma db pull > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Database connection OK${NC}"
else
    echo -e "${YELLOW}⚠️  Database connection test failed, but continuing...${NC}"
fi

# Run database migrations
echo -e "${YELLOW}🗄️  Running database migrations...${NC}"
npx prisma migrate deploy || {
    echo -e "${YELLOW}⚠️  Migrations failed, trying to initialize...${NC}"
    npx prisma migrate dev --name init || echo -e "${RED}❌ Migration failed${NC}"
}

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

# Create logs directory if it doesn't exist
mkdir -p logs
chmod 755 logs

echo -e "${GREEN}✅ Deployment preparation complete!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Start the application:"
echo "   pm2 start npm --name 'memocracy' -- start"
echo "   pm2 save"
echo ""
echo "2. Or if PM2 is not installed:"
echo "   npm start"
echo ""
echo "3. Check logs:"
echo "   pm2 logs memocracy"
echo ""
echo "4. Check status:"
echo "   pm2 status"
