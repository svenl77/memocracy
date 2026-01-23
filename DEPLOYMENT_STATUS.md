# Deployment Status

## ✅ Dateien erfolgreich hochgeladen!

**Datei**: `memocracy-deploy-20260123-144739.tar.gz` (650K)
**Ziel**: `~/public_html/` auf Server `138.197.97.25`

## ⚠️ Wichtig: Shell-Zugriff ist deaktiviert

Der Server hat Shell-Zugriff deaktiviert. Sie müssen die folgenden Schritte über das **Cloudways Panel** durchführen:

## Nächste Schritte über Cloudways Panel

### 1. Dateien extrahieren

**Option A: Via Cloudways File Manager**
1. Gehen Sie zu: **Application → File Manager**
2. Navigieren Sie zu: `public_html/`
3. Klicken Sie auf: `memocracy-deploy-20260123-144739.tar.gz`
4. Wählen Sie: **Extract** oder **Unzip**

**Option B: Via SSH (falls aktiviert)**
- Kontaktieren Sie Cloudways Support, um SSH-Zugriff zu aktivieren
- Dann können Sie die Befehle aus `QUICK_DEPLOY.md` ausführen

### 2. Environment Variables setzen

1. Gehen Sie zu: **Application → Settings → Environment Variables**
2. Fügen Sie alle Variablen aus `env.production.example` hinzu:

**Wichtige Variablen:**
```
DATABASE_URL=mysql://sskngdugvf:47UfQAqnCZ@localhost:3306/sskngdugvf?schema=public
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://phpstack-1335863-6163029.cloudwaysapps.com
BAGS_API_KEY=bags_prod_DXLLW3iBbNcigpDMR2mG_4yFyAiKuVX58-7V-YC_PQU
MEMOCRACY_PLATFORM_WALLET=your_complete_wallet_address_here
SESSION_SECRET=generate_with_openssl_rand_base64_32
JWT_SECRET=generate_with_openssl_rand_base64_32
CRON_SECRET=generate_with_openssl_rand_base64_32
```

### 3. Node.js konfigurieren

1. Gehen Sie zu: **Application → Settings**
2. **Node Version**: Wählen Sie 20.x (oder neueste LTS)
3. **Start Command**: `npm start`
4. **Port**: (wird automatisch zugewiesen)

### 4. Dependencies installieren

**Via Cloudways Terminal (falls verfügbar):**
```bash
cd ~/public_html
npm install --production
```

**Oder via SSH (falls aktiviert):**
- Siehe `QUICK_DEPLOY.md`

### 5. Prisma Setup

**Via Cloudways Terminal:**
```bash
cd ~/public_html
npx prisma generate
npx prisma migrate deploy
```

### 6. Build Application

**Via Cloudways Terminal:**
```bash
cd ~/public_html
npm run build
```

### 7. Application starten

1. Gehen Sie zu: **Application → Start/Stop**
2. Klicken Sie auf: **Start**

Oder via Terminal:
```bash
pm2 start npm --name 'memocracy' -- start
pm2 save
```

## Alternative: SSH aktivieren lassen

Falls Sie SSH-Zugriff benötigen:

1. Kontaktieren Sie Cloudways Support
2. Bitten Sie um SSH-Zugriff für den Server
3. Dann können Sie alle Befehle aus `QUICK_DEPLOY.md` direkt ausführen

## Vollständige Dokumentation

- **DEPLOYMENT.md** - Vollständige Deployment-Anleitung
- **QUICK_DEPLOY.md** - Schnellstart-Anleitung
- **env.production.example** - Environment Variables Template

## Support

Bei Problemen:
1. Prüfen Sie die Logs: **Application → Logs**
2. Prüfen Sie die Health Check: `/api/health`
3. Kontaktieren Sie Cloudways Support
