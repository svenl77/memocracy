#!/bin/bash

# Memocracy - Prepare Deployment Package
# Creates a deployment archive ready for upload

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🚀 Preparing Memocracy deployment package...${NC}"

# Create temporary directory
TEMP_DIR="deploy_package"
rm -rf $TEMP_DIR
mkdir -p $TEMP_DIR

echo -e "${YELLOW}📦 Copying files...${NC}"

# Copy all necessary files
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
  --exclude='deploy_package' \
  --exclude='deploy_temp' \
  --exclude='memocracy-deploy.tar.gz' \
  --exclude='.DS_Store' \
  --exclude='*.swp' \
  --exclude='*.swo' \
  --exclude='*.tar.gz' \
  . $TEMP_DIR/

echo -e "${GREEN}✅ Files copied${NC}"

# Create archive
ARCHIVE_NAME="memocracy-deploy-$(date +%Y%m%d-%H%M%S).tar.gz"
echo -e "${YELLOW}📦 Creating archive: ${ARCHIVE_NAME}...${NC}"
tar -czf $ARCHIVE_NAME -C $TEMP_DIR .

# Get file size
FILE_SIZE=$(du -h $ARCHIVE_NAME | cut -f1)
echo -e "${GREEN}✅ Archive created: ${ARCHIVE_NAME} (${FILE_SIZE})${NC}"

# Cleanup
rm -rf $TEMP_DIR

echo ""
echo -e "${GREEN}✅ Deployment package ready!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Upload ${ARCHIVE_NAME} to server via SFTP:"
echo "   - Host: 138.197.97.25"
echo "   - User: memocracy"
echo "   - Password: 3CYBz-p."
echo "   - Upload to: ~/public_html/"
echo ""
echo "2. SSH into server:"
echo "   ssh memocracy@138.197.97.25"
echo ""
echo "3. Extract and deploy:"
echo "   cd ~/public_html"
echo "   tar -xzf ${ARCHIVE_NAME}"
echo "   chmod +x deploy-remote.sh"
echo "   ./deploy-remote.sh"
echo ""
echo "4. Create .env file (if not exists):"
echo "   cp env.production.example .env"
echo "   nano .env  # Edit with correct values"
echo ""
echo "5. Start application:"
echo "   pm2 start npm --name 'memocracy' -- start"
echo "   pm2 save"
