# Memocracy - Technical Stack Overview

## 🏗️ Architecture

### Application Type
- **Full-Stack Web Application**
- **Server-Side Rendered (SSR)** with Next.js App Router
- **API Routes** for backend functionality
- **Client-Side** wallet integration for blockchain interactions

### Deployment Architecture
```
┌─────────────────────────────────────────┐
│         Cloudways Server                 │
│  ┌───────────────────────────────────┐  │
│  │   Next.js Application (Node.js)    │  │
│  │   - Port: 3000 (or auto-assigned)  │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │   MySQL Database                  │  │
│  │   - Port: 3306                    │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │   Redis (Optional)                │  │
│  │   - Port: 6379                   │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
         │
         ├──> Solana Blockchain (Mainnet)
         ├──> Bags API
         └──> DexScreener API
```

---

## 📦 Dependencies

### Core Framework
```json
{
  "next": "14.0.4",
  "react": "^18",
  "react-dom": "^18",
  "typescript": "^5"
}
```

### Blockchain Integration
```json
{
  "@solana/web3.js": "^1.87.6",
  "@solana/spl-token": "^0.4.14",
  "@solana/wallet-adapter-react": "^0.15.35",
  "@solana/wallet-adapter-react-ui": "^0.9.35",
  "@solana/wallet-adapter-wallets": "^0.19.32"
}
```

### Database & ORM
```json
{
  "@prisma/client": "^5.7.1",
  "prisma": "^5.7.1"
}
```

### Utilities
```json
{
  "winston": "^3.19.0",           // Logging
  "lru-cache": "^11.2.4",         // Rate limiting
  "jsonwebtoken": "^9.0.2",       // Authentication
  "zod": "^3.22.4",               // Validation
  "qrcode": "^1.5.4",             // QR code generation
  "date-fns": "^3.0.6",           // Date utilities
  "cookie": "^0.6.0",             // Cookie handling
  "tweetnacl": "^1.0.3"           // Cryptography
}
```

### UI & Styling
```json
{
  "tailwindcss": "^3.3.0",
  "lucide-react": "^0.562.0",
  "react-hot-toast": "^2.6.0",
  "clsx": "^2.0.0"
}
```

---

## 🔌 External Services

### 1. Bags API
- **Base URL**: `https://public-api-v2.bags.fm/api/v1`
- **Authentication**: API Key (header: `x-api-key`)
- **Purpose**: Token launch, fee sharing configuration
- **Rate Limit**: 1,000 requests/hour
- **Documentation**: https://docs.bags.fm/

### 2. DexScreener API
- **Base URL**: `https://api.dexscreener.com`
- **Purpose**: Token price, market data, trading information
- **No authentication required**

### 3. Solana RPC
- **Public**: `https://api.mainnet-beta.solana.com`
- **Recommended**: Private RPC endpoint for better performance
- **Purpose**: Blockchain data, transaction submission

### 4. Solana Memo Program
- **Program ID**: `MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr`
- **Purpose**: Transaction memos for payment links

---

## 🗄️ Database Schema

### Key Models

**Coin** - Token/community information
- `id`, `mint`, `symbol`, `name`
- Relations: `polls`, `wallets`, `votes`, `trustScore`

**Poll** - Community polls
- `id`, `title`, `description`, `coinId`
- `minContributionLamports` - Token-gated access
- `options` - JSON array of poll options

**CoinVote** - Upvote/downvote system
- `id`, `coinId`, `voterAddress`, `voteType`
- `transactionSignature` - On-chain transaction
- `onChainSynced` - Sync status

**BagsCoin** - Bags-powered tokens
- `id`, `tokenMint`, `tokenName`, `tokenSymbol`
- `bagsLaunchTxSignature` - Launch transaction
- `platformFeePercentage` - Platform fee (3%)

**BagsFoundingWallet** - Fee distribution wallets
- `id`, `bagsCoinId`, `walletAddress`
- `feeSharePercentage` - Fee share (0.0 - 1.0)
- `lifetimeFees` - Total fees received

**TrustScore** - AI analysis scores
- `coinId`, `maturity`, `security`, `liquidity`
- `trading`, `stability`, `communitySentiment`
- `overallScore` - Weighted average

See `prisma/schema.prisma` for complete schema.

---

## 🔐 Security Features

### Authentication
- **JWT Tokens** for session management
- **Solana Signature Verification** for wallet authentication
- **Nonce-based** authentication flow

### Rate Limiting
- **LRU Cache** (in-memory) by default
- **Redis** option for distributed systems
- **Per-IP** and **per-user** limits
- Configurable windows and limits

### Security Headers
Configured in `next.config.js`:
- `Strict-Transport-Security`
- `X-Frame-Options`
- `X-Content-Type-Options`
- `X-XSS-Protection`
- `Referrer-Policy`
- `Permissions-Policy`

### CORS
- Configurable allowed origins
- API routes have CORS headers
- Controlled via `ALLOWED_ORIGINS` env variable

---

## 📡 API Architecture

### Request Flow

```
Client Request
    ↓
Next.js API Route
    ↓
Rate Limiting Check
    ↓
Authentication/Authorization
    ↓
Business Logic
    ↓
Database/External API
    ↓
Response
```

### Error Handling
- Centralized error handling in `src/lib/errorHandling.ts`
- Retry logic with exponential backoff
- Graceful degradation
- User-friendly error messages

### Logging
- Winston logger configured
- Structured logging
- Log levels: error, warn, info, debug
- Logs to files: `logs/combined.log`, `logs/error.log`

---

## 🎨 Frontend Architecture

### Component Structure
```
components/
├── Header.tsx              # Navigation
├── WalletProvider.tsx      # Solana wallet context
├── coin/
│   └── SocialLinks.tsx
├── coinVote/
│   └── CoinVoteButtons.tsx
└── ...
```

### State Management
- **React Hooks** (useState, useEffect, useContext)
- **Wallet Adapter** for wallet state
- **Server Components** for data fetching (Next.js 14)

### Styling
- **Tailwind CSS** utility-first
- **Responsive design** (mobile-first)
- **Dark mode** support (via Tailwind)

---

## 🔄 Background Jobs

### Cron Jobs

1. **Sync Votes** (`/api/cron/sync-votes`)
   - Frequency: Every 5 minutes
   - Purpose: Sync on-chain votes with database

2. **Sync Bags Fees** (`/api/cron/sync-bags-fees`)
   - Frequency: Every hour
   - Purpose: Update fee analytics for Bags coins

3. **Monitor Wallets** (`/api/cron/monitor-wallets`)
   - Frequency: Every 10 minutes
   - Purpose: Scan founding wallet transactions

### Authentication
- All cron jobs require `X-Cron-Secret` header
- Secret stored in `CRON_SECRET` env variable

---

## 🚀 Build Process

### Development
```bash
npm run dev
# Starts Next.js dev server on http://localhost:3000
```

### Production Build
```bash
npm run build
# Creates optimized production build in .next/
```

### Start Production
```bash
npm start
# Starts Next.js production server
```

### Build Output
- `.next/` - Compiled application
- Static assets optimized
- Server-side code bundled
- Client-side code code-split

---

## 📊 Performance Considerations

### Optimization
- **Next.js Image Optimization** for token images
- **Code Splitting** automatic with Next.js
- **Static Generation** where possible
- **API Route Caching** via rate limiting

### Database
- **Prisma Connection Pooling** (automatic)
- **Indexed Queries** (via Prisma schema)
- **Efficient Relations** (selective includes)

### External APIs
- **Request Caching** for DexScreener data
- **Retry Logic** for failed requests
- **Timeout Protection** (5-10 seconds)

---

## 🔧 Development Tools

### Code Quality
- **TypeScript** for type safety
- **ESLint** for code linting
- **Prettier** (via ESLint config)

### Database Tools
- **Prisma Studio**: `npm run db:studio`
- **Prisma Migrate**: `npm run db:migrate`

### Testing
- Manual testing recommended
- Health check endpoint: `/api/health`

---

## 📈 Monitoring

### Logs
- Application logs: `logs/combined.log`
- Error logs: `logs/error.log`
- PM2 logs: `pm2 logs memocracy`

### Health Checks
- Endpoint: `/api/health`
- Returns: Application status, database connection, timestamp

### Metrics
- Monitor via Cloudways Panel
- Application → Monitoring
- Check CPU, Memory, Network usage

---

## 🔄 Update Process

### Code Updates
```bash
# Pull latest changes
git pull origin main

# Install new dependencies
npm install --production

# Run migrations
npx prisma migrate deploy

# Rebuild
npm run build

# Restart
pm2 restart memocracy
```

### Database Migrations
```bash
# Create migration
npx prisma migrate dev --name migration_name

# Deploy to production
npx prisma migrate deploy
```

---

## 🆘 Common Issues & Solutions

### Issue: Build fails
**Solution**: Check Node.js version (18+), clear cache, check memory

### Issue: Database connection fails
**Solution**: Verify credentials, check connection string format

### Issue: Wallet connection hangs
**Solution**: Check timeout settings, verify wallet adapter configuration

### Issue: Bags API 400 errors
**Solution**: Verify API key, check image file format, validate request body

### Issue: Rate limiting not working
**Solution**: Check Redis connection (if using), verify rate limit configuration

---

**Last Updated**: 2025-01-23
**Maintained By**: Development Team
