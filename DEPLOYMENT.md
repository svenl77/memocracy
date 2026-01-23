# Memocracy - Cloudways Deployment Guide

## Server Information

### Cloudways Server Details
- **Server URL**: https://phpstack-1335863-6163029.cloudwaysapps.com/
- **Public IP**: 138.197.97.25
- **Application Name**: memocracy
- **Platform**: Node.js (Next.js 14)

### Database Credentials
- **DB Name**: `sskngdugvf`
- **Username**: `sskngdugvf`
- **Password**: `47UfQAqnCZ`
- **Host**: `localhost` (or internal IP provided by Cloudways)
- **Port**: 3306 (MySQL default)
- **Connection String**: `mysql://sskngdugvf:47UfQAqnCZ@localhost:3306/sskngdugvf?schema=public`

### Redis Credentials
- **Prefix**: `sskngdugvf:`
- **Username**: `sskngdugvf`
- **Password**: `M3Q2gPTqRp`
- **Host**: `localhost` (or internal IP provided by Cloudways)
- **Port**: 6379 (Redis default)
- **Connection String**: `redis://sskngdugvf:M3Q2gPTqRp@localhost:6379`

### SFTP Access
- **Host**: 138.197.97.25
- **Username**: `memocracy`
- **Password**: `3CYBz-p.`
- **Port**: 22

### SSH Access
- **Host**: 138.197.97.25
- **Username**: `memocracy`
- **SSH Key**: (See SSH public key below)
- **Port**: 22

**SSH Public Key**:
```
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQC6sGOk6iH8EF9rXGkpzMly2Oa9bj9FZRQ/L2C4ZEUN5ipOdAKXs9e9mWsr+rTFDID96UM6KAROfOqXa1eq3x0ev4ap4tRJqihz3F9bkDcxrdsznLsq1pXslhyCsJPsil0xDAl4aaupK2lcmOO7oZ4MwbxUMHll3RfuPycdIwWciMupOtYA8RyUirJGVB3XlJu5r45Cu3U+E4e4rtb5dztGrY6TInyrAdX9c6WY0LYISR/L4btqKfdY/n75L8nWtpcT9QDdD7QzCQTBiFFtGQHXjxxnhibLoOeEBKZu0RVnT4DC7VTgDs6W4Euxgz5WG0BY8wYGjCMX3+YIoZeVMM/NfAin0vLDOCgT80fwy9JkZZGAj6Q05qsCdQarUR8erd6UPAA64oS3rP40sxGlYzIov0ZQn7BCQZjR/sp6qOLswAha5O8Itt3+p3uV1xlbpebb5daifzmsGwJIM5dQKJ1rR0xAlgUEl5Q/3Pd6yXsS0Kl/EYHxuaLNMqvcgUF5oSd0HZ9CkCJkh1u4CiXoH2BcMb3c9OwKJkijhEWKa1J2HxzAVDM9PTxS6g7WtXOd7t5ajPvtp0WWIBW1HLhWm5HLdAA4eXgfvkmcsrHfnGvqU7PZX8fLvBlUBdmEFzAFjmV8ybCbVFflD5BnG9vBtKIPMk6YpxW/X3Z7fSKt7zUvPw==
```

## Pre-Deployment Checklist

- [ ] Update Prisma schema for MySQL
- [ ] Create production `.env` file
- [ ] Test database connection
- [ ] Prepare build command
- [ ] Configure Cloudways application settings

## Step 1: Update Prisma Configuration for MySQL

The current schema uses SQLite. Update it for MySQL:

**File: `prisma/schema.prisma`**
```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
```

Then regenerate Prisma Client:
```bash
npx prisma generate
```

## Step 2: Initial Server Setup

### Connect to Server via SSH

```bash
ssh memocracy@138.197.97.25
# Or use SSH key if configured
```

### Install Node.js (if not already installed)

Cloudways typically provides Node.js, but verify version:

```bash
node --version  # Should be 18.x or 20.x
npm --version
```

If Node.js is not installed or wrong version:

```bash
# Using nvm (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
```

### Navigate to Application Directory

```bash
# Check Cloudways panel for exact path, typically:
cd ~/applications/[app-id]/public_html
# Or
cd ~/public_html
```

## Step 3: Deploy Application

### Option A: Git Deployment (Recommended)

```bash
# Clone repository
git clone [your-repo-url] .
git checkout main  # or production branch

# Install dependencies
npm install --production
```

### Option B: SFTP Upload

1. Use SFTP client (FileZilla, Cyberduck, etc.)
2. Connect to: `138.197.97.25`
3. Username: `memocracy`
4. Password: `3CYBz-p.`
5. Upload all files to application directory (excluding `node_modules`, `.next`, `.env`)

Then via SSH:
```bash
cd ~/public_html
npm install --production
```

## Step 4: Environment Variables

### Create `.env` File

```bash
nano .env
```

**Production `.env` Template:**
```env
# Database (MySQL)
DATABASE_URL="mysql://sskngdugvf:47UfQAqnCZ@localhost:3306/sskngdugvf?schema=public"

# Next.js
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://phpstack-1335863-6163029.cloudwaysapps.com

# Solana
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
# Or use a private RPC for better performance:
# SOLANA_RPC_URL=https://your-private-rpc-url.com

SOLANA_VOTE_PROGRAM_ID=your_program_id_here

# Bags API
BAGS_API_KEY=bags_prod_DXLLW3iBbNcigpDMR2mG_4yFyAiKuVX58-7V-YC_PQU
MEMOCRACY_PLATFORM_WALLET=your_complete_platform_wallet_address_here

# Session & Security
SESSION_SECRET=generate_a_secure_random_string_here
JWT_SECRET=generate_another_secure_random_string_here

# Redis (Optional - for rate limiting)
REDIS_URL=redis://sskngdugvf:M3Q2gPTqRp@localhost:6379

# Logging
LOG_LEVEL=info

# CORS
ALLOWED_ORIGINS=https://phpstack-1335863-6163029.cloudwaysapps.com

# Cron Secret (for scheduled tasks)
CRON_SECRET=generate_secure_random_string_here

# Platform Fee (for Bags integration)
MEMOCRACY_PLATFORM_FEE_PERCENTAGE=0.03
```

**Generate Secure Secrets:**
```bash
# Generate random strings for secrets
openssl rand -base64 32
# Run this 3 times for SESSION_SECRET, JWT_SECRET, and CRON_SECRET
```

**⚠️ Important**: Cloudways also allows setting environment variables via the panel (Application → Settings → Environment Variables). This is more secure than `.env` file.

## Step 5: Database Setup

### Test Database Connection

```bash
mysql -u sskngdugvf -p -h localhost sskngdugvf
# Enter password: 47UfQAqnCZ
```

### Run Prisma Migrations

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations (production mode)
npx prisma migrate deploy

# Verify tables were created
mysql -u sskngdugvf -p sskngdugvf -e "SHOW TABLES;"
```

### Optional: Seed Database

If you have seed data:
```bash
npx prisma db seed
```

## Step 6: Build Application

```bash
# Build Next.js application
npm run build

# Verify build succeeded
ls -la .next
```

## Step 7: Configure Cloudways Application

### In Cloudways Panel:

1. **Application Settings**:
   - Application Name: `memocracy`
   - Application URL: `https://phpstack-1335863-6163029.cloudwaysapps.com`
   - Document Root: `public_html`

2. **Node.js Settings**:
   - Node Version: 20.x (or latest LTS)
   - Start Command: `npm start`
   - Port: (Cloudways will assign automatically)

3. **Environment Variables**:
   - Go to: Application → Settings → Environment Variables
   - Add all variables from `.env` file
   - **This is more secure than `.env` file**

4. **Process Manager**:
   - Cloudways uses PM2 or similar
   - Ensure `package.json` has correct start script:
     ```json
     "start": "next start"
     ```

## Step 8: Start Application

### Via Cloudways Panel:
1. Go to: Application → Start/Stop
2. Click "Start"

### Via SSH:
```bash
# Start with PM2 (recommended)
pm2 start npm --name "memocracy" -- start
pm2 save
pm2 startup  # Enable PM2 to start on server reboot

# Or start directly (for testing)
npm start
```

## Step 9: Verify Deployment

### Check Application Status

```bash
# Health check
curl http://localhost:3000/api/health

# Or from external
curl https://phpstack-1335863-6163029.cloudwaysapps.com/api/health
```

### Check Logs

```bash
# Application logs
tail -f ~/logs/combined.log

# Error logs
tail -f ~/logs/error.log

# PM2 logs
pm2 logs memocracy
```

### Test Endpoints

- Homepage: https://phpstack-1335863-6163029.cloudwaysapps.com/
- Health Check: https://phpstack-1335863-6163029.cloudwaysapps.com/api/health
- API: https://phpstack-1335863-6163029.cloudwaysapps.com/api/coins

## Step 10: SSL Certificate

Cloudways provides free SSL via Let's Encrypt:

1. Go to: **Application → SSL Certificate**
2. Click "Install Let's Encrypt SSL"
3. Enter domain: `phpstack-1335863-6163029.cloudwaysapps.com`
4. Enable "Force HTTPS Redirect"

## Step 11: Cron Jobs Setup

### Via Cloudways Panel (Recommended)

Go to: **Application → Cron Jobs**

Add cron jobs:

**Sync Votes (Every 5 minutes)**:
```bash
*/5 * * * * curl -H "X-Cron-Secret: YOUR_CRON_SECRET" https://phpstack-1335863-6163029.cloudwaysapps.com/api/cron/sync-votes
```

**Sync Bags Fees (Every hour)**:
```bash
0 * * * * curl -H "X-Cron-Secret: YOUR_CRON_SECRET" https://phpstack-1335863-6163029.cloudwaysapps.com/api/cron/sync-bags-fees
```

**Monitor Wallets (Every 10 minutes)**:
```bash
*/10 * * * * curl -H "X-Cron-Secret: YOUR_CRON_SECRET" https://phpstack-1335863-6163029.cloudwaysapps.com/api/cron/monitor-wallets
```

Replace `YOUR_CRON_SECRET` with the value from `.env` file.

### Via SSH (Alternative)

```bash
crontab -e
```

Add:
```bash
*/5 * * * * curl -H "X-Cron-Secret: YOUR_CRON_SECRET" https://phpstack-1335863-6163029.cloudwaysapps.com/api/cron/sync-votes
0 * * * * curl -H "X-Cron-Secret: YOUR_CRON_SECRET" https://phpstack-1335863-6163029.cloudwaysapps.com/api/cron/sync-bags-fees
*/10 * * * * curl -H "X-Cron-Secret: YOUR_CRON_SECRET" https://phpstack-1335863-6163029.cloudwaysapps.com/api/cron/monitor-wallets
```

## File Permissions

Ensure correct permissions:

```bash
# Application files
chmod -R 755 public_html
chown -R memocracy:memocracy public_html

# Logs directory
chmod -R 755 logs
chown -R memocracy:memocracy logs

# .next directory (build output)
chmod -R 755 .next
chown -R memocracy:memocracy .next

# .env file (restrictive permissions)
chmod 600 .env
chown memocracy:memocracy .env
```

## Monitoring & Logs

### Log Locations

- **Application Logs**: `~/logs/combined.log`
- **Error Logs**: `~/logs/error.log`
- **PM2 Logs**: `~/.pm2/logs/`
- **Access Logs**: Via Cloudways panel

### View Logs

```bash
# Real-time logs
tail -f ~/logs/combined.log

# Error logs only
tail -f ~/logs/error.log

# PM2 logs
pm2 logs memocracy

# Last 100 lines
tail -n 100 ~/logs/combined.log
```

## Backup Strategy

### Database Backup

**Via Cloudways Panel:**
1. Go to: **Application → Backups**
2. Enable automatic backups
3. Set schedule (daily recommended)

**Manual Backup:**
```bash
mysqldump -u sskngdugvf -p sskngdugvf > backup_$(date +%Y%m%d_%H%M%S).sql
# Enter password: 47UfQAqnCZ
```

### Application Backup

```bash
# Create backup
tar -czf memocracy_backup_$(date +%Y%m%d_%H%M%S).tar.gz public_html/

# Restore
tar -xzf memocracy_backup_YYYYMMDD_HHMMSS.tar.gz
```

## Updates & Maintenance

### Update Application

```bash
# Pull latest changes
git pull origin main

# Install new dependencies
npm install --production

# Run migrations
npx prisma migrate deploy

# Rebuild
npm run build

# Restart application
pm2 restart memocracy
```

### Update Dependencies

```bash
# Check outdated packages
npm outdated

# Update specific package
npm update package-name

# Update all (careful!)
npm update
npm run build
pm2 restart memocracy
```

## Troubleshooting

### Application Won't Start

1. **Check Node.js version**:
   ```bash
   node --version
   ```

2. **Check logs**:
   ```bash
   tail -f ~/logs/error.log
   pm2 logs memocracy
   ```

3. **Check process**:
   ```bash
   ps aux | grep node
   pm2 list
   pm2 status
   ```

4. **Check port**:
   ```bash
   netstat -tulpn | grep :3000
   ```

5. **Check environment variables**:
   ```bash
   pm2 env memocracy
   ```

### Database Connection Issues

1. **Test connection**:
   ```bash
   mysql -u sskngdugvf -p -h localhost sskngdugvf
   # Enter password: 47UfQAqnCZ
   ```

2. **Check DATABASE_URL** in `.env`:
   ```env
   DATABASE_URL="mysql://sskngdugvf:47UfQAqnCZ@localhost:3306/sskngdugvf?schema=public"
   ```

3. **Verify database exists**:
   ```sql
   SHOW DATABASES;
   USE sskngdugvf;
   SHOW TABLES;
   ```

4. **Check Prisma connection**:
   ```bash
   npx prisma db pull
   ```

### Build Errors

1. **Clear cache**:
   ```bash
   rm -rf .next
   rm -rf node_modules
   npm install
   npm run build
   ```

2. **Check Node.js version compatibility**:
   - Next.js 14 requires Node.js 18.17 or later

3. **Check memory**:
   ```bash
   free -h
   ```

### Memory Issues

If application crashes due to memory:

1. **Increase Node.js memory limit**:
   ```bash
   # In package.json or PM2 config
   NODE_OPTIONS="--max-old-space-size=4096" npm start
   ```

2. **PM2 memory limit**:
   ```bash
   pm2 start npm --name "memocracy" -- start --max-memory-restart 1G
   ```

3. **Check via Cloudways panel**: Application → Settings → Resources

### Port Already in Use

```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 [PID]

# Or change port in .env
PORT=3001
```

## Security Checklist

- [ ] All environment variables set in Cloudways panel (not in `.env` file)
- [ ] `.env` file not committed to Git (in `.gitignore`)
- [ ] `.env` file has restrictive permissions (600)
- [ ] SSL certificate installed and HTTPS enforced
- [ ] Database credentials are secure
- [ ] Cron secrets are strong random strings
- [ ] File permissions are correct (no 777)
- [ ] Regular backups enabled
- [ ] Logs are monitored
- [ ] Rate limiting is enabled
- [ ] CORS is properly configured
- [ ] Security headers are enabled (via `next.config.js`)

## Quick Reference Commands

```bash
# SSH into server
ssh memocracy@138.197.97.25

# View logs
tail -f ~/logs/combined.log
pm2 logs memocracy

# Restart application
pm2 restart memocracy

# Check application status
pm2 status
pm2 info memocracy

# Database backup
mysqldump -u sskngdugvf -p sskngdugvf > backup.sql

# Run migrations
npx prisma migrate deploy

# Rebuild application
npm run build

# Check Node.js version
node --version

# Check disk space
df -h

# Check memory
free -h

# Check running processes
ps aux | grep node
pm2 list
```

## Support & Resources

- **Cloudways Documentation**: https://support.cloudways.com/
- **Cloudways Node.js Guide**: https://www.cloudways.com/blog/how-to-host-a-node-js-application/
- **Next.js Deployment**: https://nextjs.org/docs/deployment
- **Prisma Deployment**: https://www.prisma.io/docs/guides/deployment
- **PM2 Documentation**: https://pm2.keymetrics.io/docs/usage/quick-start/

---

**Last Updated**: 2025-01-XX
**Deployed By**: [Your Name]
**Server**: Cloudways
**Application**: Memocracy
**Status**: Production
