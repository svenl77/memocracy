# Fee Share Display für Bags Coins - Implementation Plan

## 📋 Projekt-Übersicht

**Memocracy** ist eine AI-powered Memecoin Intelligence Platform mit Bags API Integration. Wir möchten eine Fee Share Anzeige implementieren, die zeigt, wie die Trading Fees bei Bags Coins verteilt werden.

**Repository**: https://github.com/svenl77/memocracy  
**Live URL**: https://phpstack-1335863-6163029.cloudwaysapps.com/

---

## 🎯 Ziel

Wenn ein Coin erstellt wird (via Contract Address) und es ist ein **Bags Coin**, sollen wir automatisch die **Fee Share Distribution** anzeigen:

- **Holder Share** (Rest nach allen Fee Shares)
- **Alle Fee Shares** mit:
  - Wallet Adresse
  - Prozentanteil (%)
  - Lifetime Earnings (Einnahmen)

**Unterschiedliche Darstellung** für:
1. **Von uns erstellt** (`createdByMemocracy: true`) - Coins die via `/admin/bags-coin` erstellt wurden
2. **Existierend** (`createdByMemocracy: false`) - Coins die bereits existieren und auf Bags laufen

---

## 🏗️ Aktuelle Architektur

### Database Schema

**Coin Model** (`prisma/schema.prisma`):
```prisma
model Coin {
  id         String          @id @default(cuid())
  mint       String          @unique
  symbol     String
  name       String
  hidden     Boolean         @default(false)
  createdAt  DateTime        @default(now())
  polls      Poll[]
  wallets    ProjectWallet[]
  trustScore TrustScore?
  votes      CoinVote[]
  
  // Bags Coin relation (optional - only for Bags-powered coins)
  bagsCoin BagsCoin?
}
```

**BagsCoin Model**:
```prisma
model BagsCoin {
  id          String  @id @default(cuid())
  tokenMint   String  @unique // Bags Token Mint (also Coin.mint)
  tokenName   String
  tokenSymbol String
  description String?
  image       String?
  
  // Link to Coin
  coinId String @unique
  coin   Coin   @relation(fields: [coinId], references: [id], onDelete: Cascade)
  
  // Bags API Integration
  bagsLaunchTxSignature         String? // Token Launch Transaction
  bagsFeeShareConfigTxSignature String? // Fee Share Config Transaction
  
  // Platform Fee
  platformFeePercentage Float  @default(0.03) // 3%
  platformWallet        String // Memocracy Platform Wallet
  
  // Creator
  createdBy String // Wallet that created
  
  // Relations
  foundingWallets BagsFoundingWallet[]
  feeAnalytics    BagsFeeAnalytics?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**BagsFoundingWallet Model**:
```prisma
model BagsFoundingWallet {
  id         String   @id @default(cuid())
  bagsCoinId String
  bagsCoin   BagsCoin @relation(fields: [bagsCoinId], references: [id], onDelete: Cascade)
  
  label              String
  description        String?
  walletAddress      String
  feeSharePercentage Float  // 0.0 - 1.0
  fundingGoalUSD     Float?
  currentBalanceUSD  Float  @default(0)
  lifetimeFees       Float  @default(0)
  lastFeeUpdate      DateTime?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### Coin Creation Flow

**1. Via Bags API** (`/admin/bags-coin`):
- User erstellt neuen Coin via Bags API
- `BagsCoin` Eintrag wird erstellt
- `Coin` Eintrag wird erstellt
- `BagsFoundingWallet` Einträge werden erstellt
- ✅ **Hat bereits alle Fee Share Info**

**2. Via Contract Address** (`/api/coin/create`):
- User gibt Contract Address ein
- Coin wird in DB erstellt
- Trust Score wird berechnet
- ❌ **Prüft NICHT ob Bags Coin**
- ❌ **Zeigt KEINE Fee Share Info**

### Bags API Integration

**Datei**: `src/lib/bagsApi.ts`

**Verfügbare Funktionen**:
- `getTokenLifetimeFees(tokenMint)` - Lifetime Fees abrufen
- `getFeeShareWallet(tokenMint)` - Fee Share Configuration abrufen (muss geprüft werden)
- `getTokenCreators(tokenMint)` - Token Creators abrufen

**Datei**: `src/lib/bagsCoinManager.ts`

**Verfügbare Funktionen**:
- `getBagsCoinAnalytics(tokenMint)` - Analytics für Bags Coin
- `syncBagsCoinFees(tokenMint)` - Sync Fees von Bags API

---

## 📝 Detaillierter Implementation Plan

### Phase 1: Database Schema Updates

**1.1 Coin Model erweitern**
```prisma
model Coin {
  // ... existing fields
  isBagsCoin Boolean @default(false) // Detected via Bags API
  createdByMemocracy Boolean @default(false) // Has BagsCoin entry
}
```

**1.2 BagsCoin Model erweitern**
```prisma
model BagsCoin {
  // ... existing fields
  createdByMemocracy Boolean @default(true) // Created via our platform
  // If false: Coin exists but was created elsewhere
}
```

**1.3 Migration erstellen**
- Neue Felder hinzufügen
- Bestehende Bags Coins: `isBagsCoin = true`, `createdByMemocracy = true`

---

### Phase 2: Bags Coin Detection

**2.1 Coin Creation erweitern** (`src/app/api/coin/create/route.ts`)

Nach Coin-Erstellung:
1. Prüfe ob Coin bereits `BagsCoin` Eintrag hat (via `coin.bagsCoin`)
2. Wenn nicht: Rufe Bags API auf:
   ```typescript
   const feesResult = await bagsApi.getTokenLifetimeFees(mint);
   ```
3. Wenn erfolgreich → Coin ist Bags Coin:
   - Setze `isBagsCoin = true`
   - Optional: Erstelle `BagsCoin` Eintrag mit `createdByMemocracy = false`

**2.2 Bags API Funktion prüfen**

Prüfe ob `getFeeShareWallet(tokenMint)` existiert:
- Wenn ja: Nutze für Fee Share Info
- Wenn nein: Müssen wir Fee Share Info anders abrufen

**2.3 Fehlerbehandlung**
- Wenn Bags API nicht verfügbar: Setze `isBagsCoin = false`
- Logge Warnung, aber Coin wird trotzdem erstellt

---

### Phase 3: Fee Share Information abrufen

**3.1 Neue Funktion erstellen** (`src/lib/bagsCoinManager.ts`)

```typescript
export async function getBagsFeeShareInfo(tokenMint: string): Promise<{
  isBagsCoin: boolean;
  createdByMemocracy: boolean;
  totalLifetimeFees: number;
  holderShare: number; // % that goes to holders
  feeShares: Array<{
    walletAddress: string;
    label?: string; // Only if createdByMemocracy
    description?: string; // Only if createdByMemocracy
    percentage: number;
    lifetimeEarnings: number;
  }>;
  platformFee?: {
    percentage: number;
    lifetimeEarnings: number;
  }; // Only if createdByMemocracy
}>
```

**Logik**:
1. Prüfe ob `BagsCoin` Eintrag existiert:
   - Wenn ja: `createdByMemocracy = true`
   - Hole Founding Wallets aus DB
   - Berechne Lifetime Earnings: `lifetimeFees * feeSharePercentage`
2. Wenn kein `BagsCoin` Eintrag:
   - `createdByMemocracy = false`
   - Rufe Bags API auf: `getFeeShareWallet(tokenMint)` oder ähnlich
   - Parse Fee Share Configuration
3. Berechne Holder Share: `100% - Summe aller Fee Shares`

**3.2 Caching**

- Speichere Fee Share Info in `BagsFeeAnalytics` (falls vorhanden)
- Oder: Cache in Memory für 5 Minuten
- Aktualisiere via Cron Job (alle 15 Minuten)

---

### Phase 4: API Endpoints

**4.1 Fee Share Info Endpoint** (`src/app/api/coin/[mint]/fee-shares/route.ts`)

```typescript
GET /api/coin/[mint]/fee-shares

Response:
{
  isBagsCoin: boolean;
  createdByMemocracy: boolean;
  totalLifetimeFees: number;
  holderShare: {
    percentage: number;
    lifetimeEarnings: number;
  };
  feeShares: Array<{
    walletAddress: string;
    label?: string;
    description?: string;
    percentage: number;
    lifetimeEarnings: number;
  }>;
  platformFee?: {
    percentage: number;
    lifetimeEarnings: number;
  };
}
```

**Caching**: 5 Minuten (da sich nicht oft ändert)

**4.2 Coin Creation erweitern** (`src/app/api/coin/create/route.ts`)

Nach Coin-Erstellung:
- Prüfe Bags Coin
- Setze `isBagsCoin` Flag
- Optional: Erstelle `BagsCoin` Eintrag

---

### Phase 5: UI Komponente

**5.1 Neue Komponente** (`src/components/bags/FeeShareDisplay.tsx`)

**Props**:
```typescript
interface FeeShareDisplayProps {
  tokenMint: string;
  createdByMemocracy: boolean;
  feeShareInfo: {
    totalLifetimeFees: number;
    holderShare: number;
    feeShares: Array<{
      walletAddress: string;
      label?: string;
      description?: string;
      percentage: number;
      lifetimeEarnings: number;
    }>;
    platformFee?: {
      percentage: number;
      lifetimeEarnings: number;
    };
  };
}
```

**Design**:

**A) Von uns erstellt** (`createdByMemocracy: true`):
```
┌─────────────────────────────────────────────┐
│ 🎯 Fee Distribution (Bags Coin)              │
│ Created via Memocracy                        │
├─────────────────────────────────────────────┤
│ Total Lifetime Fees: $12,450.50             │
│                                             │
│ 📊 Fee Shares:                              │
│ • Development Wallet (60%)                  │
│   Address: 7VFvNFtdbSTsgp2rmhfJVeyb8U1...  │
│   Earnings: $7,470.30                       │
│                                             │
│ • Marketing Wallet (20%)                    │
│   Address: 9R4zqfeasqeEKCEQxX89gbK5dXvk...  │
│   Earnings: $2,490.10                       │
│                                             │
│ • Community Fund (10%)                      │
│   Address: Dfh5DzRgSvvCFDoYc2ciTkMrbDfR...  │
│   Earnings: $1,245.05                       │
│                                             │
│ • Platform Fee (3%)                         │
│   Earnings: $373.52                         │
│                                             │
│ 👥 Holder Share (7%)                         │
│   Earnings: $871.54                          │
└─────────────────────────────────────────────┘
```

**B) Existierend** (`createdByMemocracy: false`):
```
┌─────────────────────────────────────────────┐
│ 🎯 Fee Distribution (Bags Coin)              │
│ Existing Bags Token                          │
├─────────────────────────────────────────────┤
│ Total Lifetime Fees: $8,230.00              │
│                                             │
│ 📊 Fee Shares:                              │
│ • Wallet 1 (45%)                            │
│   Address: 7VFvNFtdbSTsgp2rmhfJVeyb8U1...  │
│   Earnings: $3,703.50                       │
│                                             │
│ • Wallet 2 (30%)                            │
│   Address: 9R4zqfeasqeEKCEQxX89gbK5dXvk...  │
│   Earnings: $2,469.00                       │
│                                             │
│ • Wallet 3 (15%)                             │
│   Address: Dfh5DzRgSvvCFDoYc2ciTkMrbDfR...  │
│   Earnings: $1,234.50                       │
│                                             │
│ 👥 Holder Share (10%)                        │
│   Earnings: $823.00                          │
└─────────────────────────────────────────────┘
```

**Features**:
- Wallet Adressen kopierbar (Copy Button)
- Responsive Design
- Loading State
- Error State (falls Bags API nicht verfügbar)

**5.2 Integration in Coin Detail Page** (`src/app/coin/[ca]/page.tsx`)

**Position**: Nach Token Info, vor Polls Section

**Logik**:
1. Prüfe ob `coin.isBagsCoin === true`
2. Wenn ja: Rufe `/api/coin/[mint]/fee-shares` auf
3. Zeige `FeeShareDisplay` Komponente
4. Loading State während API Call
5. Error Handling falls API fehlschlägt

---

## 🔧 Technische Details

### Bags API Endpoints

**Bekannte Endpoints**:
- `GET /fee-share/get-fee-share-wallet?tokenMint={mint}` - Fee Share Wallet Info
- `GET /analytics/get-token-lifetime-fees?tokenMint={mint}` - Lifetime Fees

**Zu prüfen**:
- Gibt es einen Endpoint für Fee Share Configuration?
- Wie bekommen wir die Liste aller Fee Share Wallets?

### Fee Share Berechnung

**Holder Share**:
```
Holder Share % = 100% - (Summe aller Fee Share %)
Holder Share Earnings = Total Lifetime Fees * (Holder Share % / 100)
```

**Beispiel**:
- Total Fees: $10,000
- Wallet 1: 45% = $4,500
- Wallet 2: 30% = $3,000
- Wallet 3: 15% = $1,500
- Platform: 3% = $300
- **Holder Share: 7% = $700**

### Caching Strategy

**Option 1: Database Cache** (Empfohlen)
- Speichere in `BagsFeeAnalytics` oder neuem Model
- Aktualisiere via Cron Job (alle 15 Minuten)

**Option 2: Memory Cache**
- LRU Cache für 5 Minuten
- Schneller, aber verloren bei Restart

**Option 3: Hybrid**
- Memory Cache für schnelle Abfragen
- Database als Fallback

---

## 📊 Offene Fragen / Entscheidungen

### 1. Existierende Coins automatisch als BagsCoin speichern?

**Option A: Ja** (Empfohlen)
- Pro: Schnellere Abfragen, vollständige Daten
- Pro: Können später Founding Wallets hinzufügen
- Contra: Mehr DB-Einträge

**Option B: Nein**
- Pro: Weniger DB-Einträge
- Contra: Muss jedes Mal Bags API aufrufen

**Empfehlung**: Option A - Erstelle `BagsCoin` Eintrag mit `createdByMemocracy = false`

### 2. Wie oft Fee Share Info aktualisieren?

**Option A: Bei jedem Page Load**
- Pro: Immer aktuell
- Contra: Langsam, viele API Calls

**Option B: Via Cron Job** (Empfohlen)
- Pro: Schnelle Page Loads
- Pro: Weniger API Calls
- Contra: Kann 15 Minuten alt sein

**Option C: On-Demand**
- Pro: Immer aktuell wenn benötigt
- Contra: Langsam beim ersten Load

**Empfehlung**: Option B - Cron Job alle 15 Minuten + Memory Cache für 5 Minuten

### 3. Holder Share berechnen?

**Option A: Berechnen** (Empfohlen)
- `100% - Summe aller Fee Shares`
- Pro: Einfach, zuverlässig
- Contra: Kann abweichen wenn Bags API ungenau

**Option B: Von Bags API abrufen**
- Pro: Genauer
- Contra: Gibt es diesen Endpoint?

**Empfehlung**: Option A - Berechnen

### 4. Was wenn Bags API nicht verfügbar?

**Option A: Keine Fee Share Info anzeigen** (Empfohlen)
- Pro: Keine Fehler
- Contra: Feature nicht verfügbar

**Option B: Cached Data verwenden**
- Pro: Feature bleibt verfügbar
- Contra: Kann veraltet sein

**Empfehlung**: Option A - Zeige Error Message: "Fee Share information temporarily unavailable"

---

## 🚀 Implementierungsreihenfolge

1. **Phase 1**: Database Schema Updates + Migration
2. **Phase 2**: Bags Coin Detection in Coin Creation
3. **Phase 3**: Fee Share Information abrufen (Bags API)
4. **Phase 4**: API Endpoints
5. **Phase 5**: UI Komponente + Integration

---

## 📁 Relevante Dateien

### Backend
- `src/app/api/coin/create/route.ts` - Coin Creation (erweitern)
- `src/app/api/coin/[mint]/fee-shares/route.ts` - **NEU** Fee Share Endpoint
- `src/lib/bagsApi.ts` - Bags API Client
- `src/lib/bagsCoinManager.ts` - Bags Coin Management (erweitern)
- `prisma/schema.prisma` - Database Schema (erweitern)

### Frontend
- `src/app/coin/[ca]/page.tsx` - Coin Detail Page (erweitern)
- `src/components/bags/FeeShareDisplay.tsx` - **NEU** Fee Share Component

### Database
- `prisma/migrations/` - Neue Migration für Schema Updates

---

## 🧪 Testing

### Test Cases

1. **Coin Creation - Bags Coin erkannt**
   - Erstelle Coin mit Bags Token Mint
   - Prüfe: `isBagsCoin = true`
   - Prüfe: Fee Share Info wird angezeigt

2. **Coin Creation - Nicht Bags Coin**
   - Erstelle Coin mit normalem Token Mint
   - Prüfe: `isBagsCoin = false`
   - Prüfe: Keine Fee Share Info

3. **Von uns erstellt - Fee Share Display**
   - Zeige Coin der via `/admin/bags-coin` erstellt wurde
   - Prüfe: Labels werden angezeigt
   - Prüfe: Platform Fee wird angezeigt

4. **Existierend - Fee Share Display**
   - Zeige existierenden Bags Coin
   - Prüfe: Keine Labels (nur Adressen)
   - Prüfe: Keine Platform Fee

5. **Bags API Fehler**
   - Simuliere Bags API Fehler
   - Prüfe: Graceful Error Handling
   - Prüfe: Coin wird trotzdem erstellt

---

## 📚 Referenzen

- **Bags API Docs**: https://docs.bags.fm/
- **Repository**: https://github.com/svenl77/memocracy
- **HANDOVER.md**: Vollständige Developer Dokumentation
- **BAGS_INTEGRATION_PLAN.md**: Bags Integration Details

---

## ✅ Checklist

- [ ] Database Schema erweitert
- [ ] Migration erstellt und getestet
- [ ] Bags Coin Detection implementiert
- [ ] Fee Share Info Funktion erstellt
- [ ] API Endpoint erstellt
- [ ] UI Komponente erstellt
- [ ] Integration in Coin Detail Page
- [ ] Error Handling implementiert
- [ ] Caching implementiert
- [ ] Cron Job für Fee Sync (optional)
- [ ] Testing abgeschlossen
- [ ] Dokumentation aktualisiert

---

**Ready for Implementation!** 🚀

Dieses Dokument enthält alle Informationen, die für die Implementierung benötigt werden. Starte mit Phase 1 und arbeite dich durch alle Phasen.
