# Quick Deployment Guide

## Deployment-Paket wurde erstellt! ✅

**Datei**: `memocracy-deploy-20260123-144739.tar.gz` (652K)

## Option 1: Automatischer Upload (wenn sshpass installiert ist)

```bash
# Install sshpass (falls nicht vorhanden)
# macOS: brew install hudochenkov/sshpass/sshpass
# Linux: sudo apt-get install sshpass

# Upload und Deployment
./upload-to-server.sh
```

## Option 2: Manueller Upload (empfohlen)

### Schritt 1: Datei per SFTP hochladen

**Mit FileZilla, Cyberduck oder Terminal:**

```bash
# Via SCP (wird nach Passwort fragen)
scp memocracy-deploy-20260123-144739.tar.gz memocracy@138.197.97.25:~/public_html/
# Password: 3CYBz-p.
```

**Oder mit SFTP-Client:**
- Host: `138.197.97.25`
- User: `memocracy`
- Password: `3CYBz-p.`
- Upload zu: `~/public_html/`

### Schritt 2: SSH in den Server

```bash
ssh memocracy@138.197.97.25
# Password: 3CYBz-p.
```

### Schritt 3: Auf dem Server - Extract und Deploy

```bash
cd ~/public_html

# Extract archive
tar -xzf memocracy-deploy-20260123-144739.tar.gz

# Make deploy script executable
chmod +x deploy-remote.sh

# Run deployment
./deploy-remote.sh
```

### Schritt 4: Environment Variables setzen

```bash
# Create .env file
cp env.production.example .env

# Edit .env with correct values
nano .env
```

**Wichtige Variablen die gesetzt werden müssen:**
- `DATABASE_URL` - bereits korrekt (MySQL)
- `MEMOCRACY_PLATFORM_WALLET` - Vollständige Solana-Adresse
- `SESSION_SECRET` - Generieren mit: `openssl rand -base64 32`
- `JWT_SECRET` - Generieren mit: `openssl rand -base64 32`
- `CRON_SECRET` - Generieren mit: `openssl rand -base64 32`

### Schritt 5: Application starten

```bash
# Install PM2 (falls nicht vorhanden)
npm install -g pm2

# Start application
pm2 start npm --name 'memocracy' -- start
pm2 save
pm2 startup  # Enable auto-start on reboot

# Check status
pm2 status
pm2 logs memocracy
```

### Schritt 6: Verify

```bash
# Health check
curl http://localhost:3000/api/health

# Or from browser
https://phpstack-1335863-6163029.cloudwaysapps.com/api/health
```

## Troubleshooting

### Wenn PM2 nicht installiert ist:
```bash
npm install -g pm2
```

### Wenn Node.js nicht installiert ist:
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc

# Install Node.js 20
nvm install 20
nvm use 20
nvm alias default 20
```

### Wenn Build fehlschlägt:
```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

### Database Connection Test:
```bash
mysql -u sskngdugvf -p -h localhost sskngdugvf
# Password: 47UfQAqnCZ
```

## Vollständige Dokumentation

Siehe `DEPLOYMENT.md` für vollständige Anleitung mit allen Details.
