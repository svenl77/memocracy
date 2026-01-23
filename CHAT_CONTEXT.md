# Chat Context & Codebase Summary

## 🎯 Project Overview

**Project Name:** Memocracy / Solana Memecoin Community Platform  
**Tech Stack:** Next.js 14 (App Router), React, TypeScript, Prisma (SQLite), Solana Web3.js  
**Purpose:** Platform for evaluating, voting on, and managing memecoin communities with trust scores, polls, and founding wallets

---

## 📁 Critical File Structure

### Core Application Files
- `src/app/layout.tsx` - Root layout with WalletProvider
- `src/app/(site)/page.tsx` - Homepage with coin listings and filters
- `src/app/coin/[ca]/page.tsx` - Coin detail page (⚠️ **CHECK FOR DUPLICATE FOUNDING WALLET SECTIONS**)
- `src/app/coin/[ca]/layout.tsx` - Coin page layout with tabs (Overview/Analytics)
- `src/app/coin/[ca]/analytics/page.tsx` - Trust score analytics page
- `src/app/admin/page.tsx` - Admin page with tabs (Add Coin, Create Poll, Founding Wallets)

### API Routes
- `src/app/api/coin/[ca]/route.ts` - **⚠️ Returns `foundingWallets` array - check if displayed twice**
- `src/app/api/coin/create/route.ts` - Create new coin
- `src/app/api/coins/route.ts` - List all coins (returns `{ coins: [], pagination: {} }`)
- `src/app/api/founding-wallets/route.ts` - CRUD for founding wallets
- `src/app/api/founding-wallets/[id]/route.ts` - Get/update specific founding wallet
- `src/app/api/trust-score/[tokenAddress]/route.ts` - Get/recalculate trust score
- `src/app/api/cron/update-token-metadata/route.ts` - Background job for token updates
- `src/app/api/cron/update-founding-wallets/route.ts` - Background job for founding wallet updates

### Trust Score System
- `src/lib/trustScore/index.ts` - Main trust score calculation (WEIGHTS configuration)
- `src/lib/trustScore/checks/maturity.ts` - Age-based scoring (0-50 points)
- `src/lib/trustScore/checks/security.ts` - Mint/freeze authority checks (0-25 points)
- `src/lib/trustScore/checks/liquidity.ts` - Liquidity scoring (0-35 points, includes market cap bonus)
- `src/lib/trustScore/checks/trading.ts` - Trading volume scoring (0-30 points, includes market cap bonus)
- `src/lib/trustScore/checks/stability.ts` - Price volatility scoring (0-20 points)
- `src/lib/trustScore/checks/communitySentiment.ts` - Community votes + market cap proxy (0-100 points)
- `src/lib/trustScore/types.ts` - TypeScript interfaces

**Current WEIGHTS:**
```typescript
maturity: 0.15 (15%)
security: 0.20 (20%)
liquidity: 0.25 (25%)
trading: 0.20 (20%)
stability: 0.05 (5%)
communitySentiment: 0.15 (15%)
```

### Components
- `src/components/Header.tsx` - Global header (used on all pages except widgets)
- `src/components/SearchAndFilters.tsx` - Homepage search and filter component
- `src/components/foundingWallet/FoundingWalletCard.tsx` - Card component for founding wallet display
- `src/components/coinVote/CoinVoteButtons.tsx` - Upvote/downvote buttons
- `src/components/trustScore/TrustScorePreview.tsx` - Trust score preview component
- `src/components/WalletProvider.tsx` - Solana wallet adapter provider

### Database Schema (Prisma)
- `Coin` - Main coin/token records
- `TrustScore` - Trust score data for coins
- `CoinVote` - Up/down votes for coins
- `Poll` - Community polls
- `Vote` - Poll votes
- `ProjectWallet` - Standard and founding wallets
- `FoundingWalletTransaction` - Transaction history
- `FoundingWalletContributor` - Contributor records
- `FoundingWalletProposal` - Governance proposals
- `FoundingWalletVote` - Proposal votes
- `FoundingWalletComment` - Comments and ratings
- `FoundingWalletTrustScore` - Trust scores for founding wallets
- `TokenMetadata` - Cached token data from DexScreener

---

## 🔧 Important Patterns & Conventions

### API Response Format
- `/api/coins` returns `{ coins: [...], pagination: {...} }` (NOT a direct array)
- Always check: `if (data.coins) { setCoins(data.coins) } else if (Array.isArray(data)) { setCoins(data) } else { setCoins([]) }`

### Error Handling
- Use `logger.error()` from `@/lib/logger` (NOT `console.error`)
- Use `safeErrorResponse()` from `@/lib/apiHelpers` for API errors
- Hide stack traces in production

### Environment Variables
- All env vars validated via `@/lib/env` (Zod schema)
- Required: `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV`, `SOLANA_RPC_URL`
- Optional: `CRON_SECRET`, `ALLOWED_ORIGIN`, `LOG_LEVEL`, `ADMIN_TOKEN`, `ADMIN_WALLETS`

### Rate Limiting
- Use `rateLimitMiddleware` from `@/lib/rateLimit`
- Presets: `strict`, `default`, `lenient`

### Database
- **Current:** SQLite (`prisma/dev.db`)
- **Production:** Should migrate to PostgreSQL/MySQL (see `DATABASE_MIGRATION.md`)
- **Important:** Tables must exist before queries - check with `sqlite3 prisma/dev.db ".tables"`

### Trust Score Calculation
- Called via `calculateTrustScore(tokenAddress)` from `@/lib/trustScore`
- Results saved to `TrustScore` table
- Market cap is passed to checks that need it (liquidity, trading, communitySentiment)
- Scores are 0-100, tiers: DIAMOND (80+), GOLD (65+), SILVER (45+), BRONZE (25+), UNRATED (<25)

---

## ⚠️ Known Issues & Gotchas

### 1. Founding Wallet Section Duplication
**Issue:** Founding wallet section appears twice on coin detail page  
**Location:** `src/app/coin/[ca]/page.tsx`  
**API:** `/api/coin/[ca]` returns `foundingWallets` array  
**Action Required:** Check if `FoundingWalletCard` is rendered multiple times

### 2. API Response Format
- `/api/coins` returns object with `coins` property, NOT direct array
- Always handle: `data.coins || (Array.isArray(data) ? data : [])`

### 3. Database Tables
- If tables missing: Run `npx prisma db push` (NOT `migrate dev` for schema changes)
- Check tables exist: `sqlite3 prisma/dev.db ".tables"`

### 4. Layout Structure
- Coin pages use `src/app/coin/[ca]/layout.tsx` which includes Header
- Page components should NOT include Header again (already in layout)
- Widget pages use separate layouts without Header

### 5. TypeScript Types
- `CommunitySentimentResult` is in `src/lib/trustScore/types.ts`
- Import from types, don't redefine

---

## 🚀 Development Workflow

### Starting the Server
```bash
npm run dev
```

### Database Operations
```bash
# Push schema changes (development)
npx prisma db push

# Generate Prisma Client
npx prisma generate

# Check tables
sqlite3 prisma/dev.db ".tables"
```

### Testing Trust Score
```bash
# Recalculate for a coin
curl -X POST http://localhost:3000/api/trust-score/{tokenAddress}
```

### Clearing Build Cache
```bash
# If build errors occur
rm -rf .next
npm run dev
```

---

## 📋 Current State

### Recently Completed
- ✅ Trust Score algorithm improvements (weights, thresholds, market cap integration)
- ✅ Coin page layout fixes (Header and tabs positioning)
- ✅ Database schema fixes (all tables created)
- ✅ Production readiness features (logging, rate limiting, health checks)
- ✅ Founding Wallet system implementation
- ✅ Embed widget feature
- ✅ All changes committed and pushed to GitHub

### Known Bugs
- ⚠️ **FOUNDING WALLET SECTION APPEARS TWICE** on coin detail page (`/coin/[ca]`)
  - **LOCATION:** `src/app/coin/[ca]/page.tsx`
  - **PROBLEM:** Lines 534-551 and 553-570 both render the same "Founding Wallets Section"
  - **SOLUTION:** Remove one of the duplicate sections (keep lines 534-551, delete 553-570)
  - **ROOT CAUSE:** Code duplication - same conditional block appears twice

---

## 🎯 Next Steps for New Chat

1. **Investigate Founding Wallet Duplication**
   - Check `src/app/coin/[ca]/page.tsx` for duplicate rendering
   - Check API response structure
   - Verify `FoundingWalletCard` component usage

2. **Code Quality Checks**
   - Ensure no duplicate code
   - Verify imports are correct
   - Check for unused files/components

3. **Testing**
   - Test coin detail page with founding wallets
   - Verify trust score calculations
   - Check API responses

---

## 📝 Important Notes

- **Never** use `console.log` - use `logger` from `@/lib/logger`
- **Always** validate environment variables via `@/lib/env`
- **Always** handle API responses safely (check for `data.coins` vs array)
- **Always** check database tables exist before queries
- **Never** create duplicate components or sections
- **Always** check existing code before adding new features
- **Always** use TypeScript types from `types.ts` files
- **Never** hardcode values - use environment variables or constants

---

## 🔗 Key URLs

- Homepage: `/`
- Coin Detail: `/coin/{mintAddress}`
- Coin Analytics: `/coin/{mintAddress}/analytics`
- Admin: `/admin`
- Founding Wallet: `/founding-wallet/{id}`
- Poll: `/poll/{id}`

---

## 📚 Documentation Files

- `PRODUCTION_READINESS.md` - Production deployment guide
- `DATABASE_MIGRATION.md` - Database migration instructions
- `CRON_SETUP.md` - Cron job setup
- `EMBED_WIDGET.md` - Embed widget documentation
- `IMPLEMENTATION_SUMMARY.md` - Feature implementation summary

---

**Last Updated:** 2025-01-13  
**Git Commit:** `4ea4dea` - "feat: Major Trust Score algorithm improvements for large coins"
