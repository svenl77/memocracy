# Prompt für neuen Chat - Memocracy Codebase

## 🎯 Aufgabe

Ich arbeite an einer **Solana Memecoin Community Platform** (Next.js 14, TypeScript, Prisma). Es gibt ein Problem: **Die Founding Wallet Section erscheint 2x auf der Coin Detail Page**.

**URL:** http://localhost:3000/coin/Eyc4ozMWwUxBUTK61MTjzLBjSWWWNqqc8sjTF3Gfbonk

## 📋 WICHTIG: Bevor du Code änderst

1. **Lies die Codebase gründlich** - Nutze `codebase_search` und `read_file` um die Struktur zu verstehen
2. **Suche nach bestehenden Lösungen** - Prüfe ob ähnliche Probleme schon gelöst wurden
3. **Verstehe die Architektur** - Siehe `CHAT_CONTEXT.md` für vollständige Übersicht
4. **Keine Duplikate** - Prüfe ob Code/Components bereits existieren bevor du neue erstellst
5. **Folge den Patterns** - Nutze `logger` statt `console.log`, `safeErrorResponse` für Errors, etc.

## 🔍 Problem-Analyse Workflow

### ⚠️ HINWEIS: Problem bereits identifiziert!
**Die "Founding Wallets Section" erscheint ZWEIMAL in `src/app/coin/[ca]/page.tsx`:**
- **Erste Section:** Zeilen 534-551
- **Zweite Section (DUPLIKAT):** Zeilen 553-570

**Lösung:** Entferne die zweite Section (Zeilen 553-570), behalte die erste (534-551).

### Schritt 1: Verstehe die Coin Detail Page
- Lies `src/app/coin/[ca]/page.tsx` komplett
- **FOKUS:** Zeilen 530-575 - hier ist das Duplikat
- Suche nach allen Stellen wo `FoundingWallet` oder `foundingWallet` vorkommt
- Prüfe wie `coinData.foundingWallets` verwendet wird

### Schritt 2: Prüfe die API Response
- Lies `src/app/api/coin/[ca]/route.ts`
- Verstehe wie `foundingWallets` im Response strukturiert ist
- Prüfe ob die API möglicherweise Duplikate zurückgibt

### Schritt 3: Prüfe die Component
- Lies `src/components/foundingWallet/FoundingWalletCard.tsx`
- Verstehe wie die Component verwendet wird
- Prüfe ob sie mehrfach gerendert wird

### Schritt 4: Prüfe das Layout
- Lies `src/app/coin/[ca]/layout.tsx`
- Verstehe die Struktur (Header, Tabs, Content)
- Prüfe ob Layout und Page beide die Section rendern

## 🚫 VERMEIDE DIESE FEHLER

1. **NICHT** Code duplizieren - Prüfe immer ob schon existiert
2. **NICHT** `console.log` verwenden - Nutze `logger` aus `@/lib/logger`
3. **NICHT** API Responses falsch parsen - `/api/coins` gibt `{ coins: [] }` zurück, NICHT direkt Array
4. **NICHT** Database Queries ohne Prüfung - Tabellen müssen existieren
5. **NICHT** Types neu definieren - Nutze existierende aus `types.ts`
6. **NICHT** Header mehrfach rendern - Layout hat bereits Header
7. **NICHT** Environment Variables hardcoden - Nutze `@/lib/env`

## ✅ SOLLTE SO AUSSEHEN

```typescript
// ✅ RICHTIG: API Response Handling
const data = await response.json();
const coins = data.coins || (Array.isArray(data) ? data : []);

// ✅ RICHTIG: Logging
import { logger } from '@/lib/logger';
logger.error('Error message', { context });

// ✅ RICHTIG: Error Handling
import { safeErrorResponse } from '@/lib/apiHelpers';
return safeErrorResponse(error, request);

// ✅ RICHTIG: Environment Variables
import { env } from '@/lib/env';
const rpcUrl = env.SOLANA_RPC_URL;
```

## 🎯 Erwartetes Ergebnis

- **NUR EINE** Founding Wallet Section auf der Coin Detail Page
- Sauberer, wartbarer Code ohne Duplikate
- Alle bestehenden Features funktionieren weiter
- Keine Breaking Changes

## 📚 Ressourcen

- **Vollständige Codebase-Übersicht:** Siehe `CHAT_CONTEXT.md`
- **Trust Score System:** `src/lib/trustScore/`
- **API Routes:** `src/app/api/`
- **Components:** `src/components/`
- **Database Schema:** `prisma/schema.prisma`

## 🔧 Tools die du nutzen solltest

1. `codebase_search` - Semantische Suche nach Code-Patterns
2. `grep` - Exakte String-Suche
3. `read_file` - Dateien lesen
4. `read_lints` - TypeScript/ESLint Errors prüfen

## 💡 Tipp

Beginne mit einer **gründlichen Analyse** bevor du Änderungen machst:
1. Finde ALLE Stellen wo Founding Wallets gerendert werden
2. Verstehe den Datenfluss (API → Component → Render)
3. Identifiziere die EXAKTE Ursache der Duplikation
4. Mache dann eine gezielte, minimale Änderung

---

**Bitte analysiere zuerst gründlich, dann behebe das Problem sauber und dokumentiere deine Lösung.**
