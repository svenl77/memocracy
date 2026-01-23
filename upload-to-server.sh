#!/bin/bash

# Memocracy - Upload to Cloudways Server
# This script prepares and uploads files to the Cloudways server

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Server details
SERVER_HOST="138.197.97.25"
SERVER_USER="memocracy"
SERVER_PASS="3CYBz-p."
SERVER_PATH="~/public_html"

echo -e "${GREEN}🚀 Preparing files for upload...${NC}"

# Create temporary directory for upload
TEMP_DIR="deploy_temp"
rm -rf $TEMP_DIR
mkdir -p $TEMP_DIR

# Copy necessary files (excluding node_modules, .next, etc.)
echo -e "${YELLOW}📦 Copying files...${NC}"

# Copy all files except those in .gitignore
rsync -av --progress \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='.git' \
  --exclude='.env' \
  --exclude='.env.local' \
  --exclude='.env.production' \
  --exclude='logs' \
  --exclude='*.log' \
  --exclude='dev.db' \
  --exclude='dev.db-journal' \
  --exclude='deploy_temp' \
  --exclude='.DS_Store' \
  --exclude='*.swp' \
  --exclude='*.swo' \
  . $TEMP_DIR/

echo -e "${GREEN}✅ Files prepared${NC}"

# Create archive
echo -e "${YELLOW}📦 Creating archive...${NC}"
tar -czf memocracy-deploy.tar.gz -C $TEMP_DIR .

echo -e "${GREEN}✅ Archive created: memocracy-deploy.tar.gz${NC}"

# Upload using SCP (requires sshpass or password entry)
echo -e "${YELLOW}📤 Uploading to server...${NC}"

# Check if sshpass is installed
if command -v sshpass &> /dev/null; then
    sshpass -p "$SERVER_PASS" scp -o StrictHostKeyChecking=no memocracy-deploy.tar.gz $SERVER_USER@$SERVER_HOST:~/memocracy-deploy.tar.gz
    echo -e "${GREEN}✅ Upload complete!${NC}"
    
    echo -e "${YELLOW}🔧 Extracting on server...${NC}"
    sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_HOST << 'ENDSSH'
cd ~/public_html
tar -xzf ~/memocracy-deploy.tar.gz
rm ~/memocracy-deploy.tar.gz
chmod +x deploy.sh
echo "✅ Files extracted on server"
ENDSSH
    
    echo -e "${GREEN}✅ Deployment files uploaded and extracted!${NC}"
else
    echo -e "${YELLOW}⚠️  sshpass not installed. Manual upload required:${NC}"
    echo ""
    echo "1. Upload memocracy-deploy.tar.gz to server via SFTP:"
    echo "   Host: $SERVER_HOST"
    echo "   User: $SERVER_USER"
    echo "   Password: $SERVER_PASS"
    echo ""
    echo "2. Then SSH into server and run:"
    echo "   cd ~/public_html"
    echo "   tar -xzf ~/memocracy-deploy.tar.gz"
    echo "   chmod +x deploy.sh"
    echo "   ./deploy.sh"
fi

# Cleanup
echo -e "${YELLOW}🧹 Cleaning up...${NC}"
rm -rf $TEMP_DIR

echo -e "${GREEN}✅ Done!${NC}"
