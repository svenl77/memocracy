# Memocracy - Developer Handover Document

## 📋 Project Overview

**Memocracy** is an AI-powered memecoin intelligence platform that enables:
- **Community Governance**: Token-gated voting and polls for memecoin communities
- **Founding Wallets**: Transparent funding system for builders with reputation tracking
- **Bags Integration**: Launch new tokens via Bags API with automatic fee distribution
- **Trust Scores**: AI-powered analysis of memecoins (Maturity, Security, Liquidity, Trading, Stability, Community Sentiment)
- **On-Chain Voting**: Hybrid on-chain/off-chain voting system using Solana Programs

**Live URL**: https://phpstack-1335863-6163029.cloudwaysapps.com/

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Lucide React (icons)
- **Wallet Integration**: 
  - `@solana/wallet-adapter-react`
  - `@solana/wallet-adapter-react-ui`
  - `@solana/wallet-adapter-wallets`

### Backend
- **Runtime**: Node.js 20.x (LTS recommended)
- **API**: Next.js API Routes
- **Database**: MySQL (Production) / SQLite (Development)
- **ORM**: Prisma 5.7.1
- **Authentication**: JWT + Solana signature verification

### Blockchain
- **Network**: Solana Mainnet
- **Libraries**: 
  - `@solana/web3.js` ^1.87.6
  - `@solana/spl-token` ^0.4.14
- **On-Chain Program**: Anchor framework (Rust)

### External APIs
- **Bags API**: Token launch and fee sharing (`https://public-api-v2.bags.fm/api/v1`)
- **DexScreener**: Token price and market data
- **Solana RPC**: Blockchain data (can use private RPC for better performance)

### Infrastructure
- **Hosting**: Cloudways (Node.js application)
- **Database**: MySQL (provided by Cloudways)
- **Redis**: Available for rate limiting (optional)
- **Process Manager**: PM2 (recommended)

---

## 📁 Project Structure

```
memocracy/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (site)/            # Public pages
│   │   │   ├── page.tsx       # Homepage
│   │   │   └── coins/         # Communities listing
│   │   ├── admin/             # Admin dashboard
│   │   │   ├── page.tsx       # Admin home
│   │   │   └── bags-coin/     # Bags coin creation
│   │   ├── api/               # API routes
│   │   │   ├── bags/          # Bags API integration
│   │   │   ├── cron/          # Scheduled tasks
│   │   │   ├── polls/         # Poll management
│   │   │   └── ...
│   │   ├── coin/[ca]/         # Token community pages
│   │   ├── poll/[id]/         # Poll detail pages
│   │   └── pay/[id]/          # Payment link pages
│   ├── components/           # React components
│   │   ├── Header.tsx
│   │   ├── WalletProvider.tsx
│   │   └── ...
│   └── lib/                   # Utility functions
│       ├── bagsApi.ts         # Bags API client
│       ├── bagsCoinManager.ts # Coin management
│       ├── db.ts              # Prisma client
│       ├── solanaHelpers.ts   # Solana utilities
│       └── ...
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── migrations/           # Database migrations
├── programs/
│   └── memocracy-votes/       # Solana Anchor program
├── public/                   # Static assets
└── DEPLOYMENT.md             # Detailed deployment guide
```

---

## 🔑 Environment Variables

### Required Variables

Create a `.env` file or set in Cloudways Panel (Application → Settings → Environment Variables):

```env
# Database (MySQL)
DATABASE_URL="mysql://sskngdugvf:47UfQAqnCZ@localhost:3306/sskngdugvf?schema=public"

# Next.js
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://phpstack-1335863-6163029.cloudwaysapps.com
PORT=3000

# Solana
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
# Or use private RPC for better performance:
# SOLANA_RPC_URL=https://your-private-rpc-url.com

SOLANA_VOTE_PROGRAM_ID=your_program_id_here
# Set this after deploying the Anchor program

# Bags API
BAGS_API_KEY=bags_prod_DXLLW3iBbNcigpDMR2mG_4yFyAiKuVX58-7V-YC_PQU
MEMOCRACY_PLATFORM_WALLET=your_complete_platform_wallet_address_here
MEMOCRACY_PLATFORM_FEE_PERCENTAGE=0.03

# Security (Generate with: openssl rand -base64 32)
SESSION_SECRET=generate_secure_random_string_here
JWT_SECRET=generate_secure_random_string_here
CRON_SECRET=generate_secure_random_string_here

# Redis (Optional - for rate limiting)
REDIS_URL=redis://sskngdugvf:M3Q2gPTqRp@localhost:6379

# Logging
LOG_LEVEL=info

# CORS
ALLOWED_ORIGINS=https://phpstack-1335863-6163029.cloudwaysapps.com
```

### Generate Secure Secrets

```bash
# Generate random secrets
openssl rand -base64 32  # Run 3 times for SESSION_SECRET, JWT_SECRET, CRON_SECRET
```

---

## 🗄️ Database Setup

### Database Credentials

- **Host**: `localhost`
- **Database**: `sskngdugvf`
- **Username**: `sskngdugvf`
- **Password**: `47UfQAqnCZ`
- **Port**: `3306`

### Prisma Setup

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Verify connection
npx prisma db pull
```

### Database Schema

The database uses Prisma ORM. Key models:
- `Coin` - Token/community information
- `Poll` - Community polls
- `CoinVote` - Upvote/downvote votes
- `ProjectWallet` / `FoundingWallet` - Funding wallets
- `BagsCoin` - Bags-powered tokens
- `BagsFoundingWallet` - Fee distribution wallets
- `TrustScore` - AI analysis scores

See `prisma/schema.prisma` for full schema.

---

## 🚀 Deployment Steps

### 1. Server Access

**SSH Access** (if enabled):
```bash
ssh memocracy@138.197.97.25
# Password: 3CYBz-p.
```

**SFTP Access**:
- Host: `138.197.97.25`
- User: `memocracy`
- Password: `3CYBz-p.`
- Port: `22`

**Note**: Shell access may be disabled. Use Cloudways Panel for most operations.

### 2. Upload Application

**Option A: Git Clone** (Recommended)
```bash
cd ~/public_html
git clone https://github.com/svenl77/memocracy.git .
```

**Option B: SFTP Upload**
- Upload all files except `node_modules`, `.next`, `.env`
- Or use the deployment archive: `memocracy-deploy-*.tar.gz`

### 3. Install Dependencies

```bash
cd ~/public_html
npm install --production
```

### 4. Configure Environment

**Via Cloudways Panel** (Recommended):
1. Go to: Application → Settings → Environment Variables
2. Add all variables from `env.production.example`

**Or create `.env` file**:
```bash
cp env.production.example .env
nano .env  # Edit with correct values
chmod 600 .env  # Restrict permissions
```

### 5. Database Setup

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Verify
mysql -u sskngdugvf -p sskngdugvf
# Enter password: 47UfQAqnCZ
# SHOW TABLES;
```

### 6. Build Application

```bash
npm run build
```

This creates the `.next` directory with optimized production build.

### 7. Configure Cloudways Application

**In Cloudways Panel**:
1. **Application Settings**:
   - Application Name: `memocracy`
   - Document Root: `public_html`
   
2. **Node.js Settings**:
   - Node Version: `20.x` (or latest LTS)
   - Start Command: `npm start`
   - Port: (auto-assigned)

3. **Environment Variables**: Set all variables from `.env`

### 8. Start Application

**Via Cloudways Panel**:
- Application → Start/Stop → Start

**Or via SSH/PM2**:
```bash
# Install PM2 globally
npm install -g pm2

# Start application
pm2 start npm --name "memocracy" -- start
pm2 save
pm2 startup  # Enable auto-start on reboot
```

### 9. Verify Deployment

```bash
# Health check
curl http://localhost:3000/api/health

# Or from browser
https://phpstack-1335863-6163029.cloudwaysapps.com/api/health
```

---

## 🔄 Cron Jobs Setup

Set up scheduled tasks in Cloudways Panel (Application → Cron Jobs):

### Sync Votes (Every 5 minutes)
```bash
*/5 * * * * curl -H "X-Cron-Secret: YOUR_CRON_SECRET" https://phpstack-1335863-6163029.cloudwaysapps.com/api/cron/sync-votes
```

### Sync Bags Fees (Every hour)
```bash
0 * * * * curl -H "X-Cron-Secret: YOUR_CRON_SECRET" https://phpstack-1335863-6163029.cloudwaysapps.com/api/cron/sync-bags-fees
```

### Monitor Wallets (Every 10 minutes)
```bash
*/10 * * * * curl -H "X-Cron-Secret: YOUR_CRON_SECRET" https://phpstack-1335863-6163029.cloudwaysapps.com/api/cron/monitor-wallets
```

Replace `YOUR_CRON_SECRET` with the value from environment variables.

---

## 🔐 SSL Certificate

1. Go to: **Application → SSL Certificate**
2. Click "Install Let's Encrypt SSL"
3. Enter domain: `phpstack-1335863-6163029.cloudwaysapps.com`
4. Enable "Force HTTPS Redirect"

---

## 📊 Key Features & Endpoints

### Public Endpoints

- `GET /` - Homepage
- `GET /coins` - Communities listing
- `GET /coin/[mint]` - Token community page
- `GET /poll/[id]` - Poll detail page
- `GET /pay/[id]` - Payment link page
- `GET /api/health` - Health check

### API Endpoints

- `GET /api/coins` - List all tokens
- `GET /api/coin/[mint]` - Token details
- `POST /api/coin-vote/[mint]` - Vote on token
- `GET /api/polls` - List polls
- `POST /api/polls` - Create poll (token-gated)
- `POST /api/polls/[id]/vote` - Vote on poll
- `GET /api/bags/coins` - List Bags coins
- `POST /api/bags/coins` - Create Bags coin (FormData with image)

### Admin Endpoints

- `GET /admin` - Admin dashboard
- `GET /admin/bags-coin` - Bags coin creation

---

## 🐛 Troubleshooting

### Application Won't Start

1. **Check Node.js version**:
   ```bash
   node --version  # Should be 18+ or 20.x
   ```

2. **Check logs**:
   ```bash
   # Via Cloudways Panel: Application → Logs
   # Or via PM2:
   pm2 logs memocracy
   ```

3. **Check environment variables**:
   ```bash
   pm2 env memocracy
   ```

4. **Verify build**:
   ```bash
   ls -la .next  # Should exist
   ```

### Database Connection Issues

1. **Test connection**:
   ```bash
   mysql -u sskngdugvf -p -h localhost sskngdugvf
   # Password: 47UfQAqnCZ
   ```

2. **Check DATABASE_URL**:
   ```env
   DATABASE_URL="mysql://sskngdugvf:47UfQAqnCZ@localhost:3306/sskngdugvf?schema=public"
   ```

3. **Run Prisma commands**:
   ```bash
   npx prisma db pull
   npx prisma generate
   ```

### Build Errors

1. **Clear cache and rebuild**:
   ```bash
   rm -rf .next node_modules
   npm install
   npm run build
   ```

2. **Check Node.js version**:
   - Next.js 14 requires Node.js 18.17+

3. **Check memory**:
   ```bash
   free -h
   # If low, increase Node.js memory:
   NODE_OPTIONS="--max-old-space-size=4096" npm run build
   ```

### Port Already in Use

```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 [PID]

# Or change port in .env
PORT=3001
```

### Bags API Errors

1. **Check API key**:
   ```env
   BAGS_API_KEY=bags_prod_DXLLW3iBbNcigpDMR2mG_4yFyAiKuVX58-7V-YC_PQU
   ```

2. **Check platform wallet**:
   ```env
   MEMOCRACY_PLATFORM_WALLET=your_complete_wallet_address_here
   ```
   - Must be complete Solana address (44 characters)

3. **Check logs**:
   - Look for "Bags API" errors in application logs

---

## 📝 Important Notes

### Image Upload

- Bags API requires image file upload (not URL)
- Maximum file size: 5MB
- Supported formats: PNG, JPG, WEBP
- Recommended: Square images (1:1 ratio), minimum 200x200px

### Wallet Connection

- Uses Solana Wallet Adapter
- Supports Phantom, Solflare, and other Solana wallets
- Auto-connect is disabled to prevent hanging connections
- 15-second timeout for connection attempts

### On-Chain Voting

- Hybrid system: On-chain storage + off-chain cache
- Requires `SOLANA_VOTE_PROGRAM_ID` after deploying Anchor program
- See `programs/memocracy-votes/` for Solana program
- See `ON_CHAIN_VOTING_README.md` for deployment instructions

### Rate Limiting

- Uses LRU Cache by default (in-memory)
- Can use Redis for distributed rate limiting
- Configured in `src/lib/rateLimit.ts`

### Logging

- Winston logger configured
- Logs to `logs/combined.log` and `logs/error.log`
- Log level controlled by `LOG_LEVEL` env variable

---

## 🔗 Useful Links

- **Repository**: https://github.com/svenl77/memocracy
- **Cloudways Dashboard**: https://platform.cloudways.com/
- **Bags API Docs**: https://docs.bags.fm/
- **Next.js Docs**: https://nextjs.org/docs
- **Prisma Docs**: https://www.prisma.io/docs
- **Solana Docs**: https://docs.solana.com/

---

## 📚 Additional Documentation

- **DEPLOYMENT.md** - Detailed deployment guide
- **DEPLOYMENT_STATUS.md** - Current deployment status
- **QUICK_DEPLOY.md** - Quick start guide
- **BAGS_INTEGRATION_PLAN.md** - Bags API integration details
- **ON_CHAIN_VOTING_README.md** - On-chain voting setup
- **env.production.example** - Environment variables template

---

## 🆘 Support & Contact

### Server Credentials

- **Public IP**: 138.197.97.25
- **SFTP**: memocracy / 3CYBz-p.
- **Database**: sskngdugvf / 47UfQAqnCZ
- **Redis**: sskngdugvf / M3Q2gPTqRp

### Cloudways Support

- **Panel**: https://platform.cloudways.com/
- **Support**: Available via Cloudways support portal

### Common Issues

1. **Shell access disabled**: Use Cloudways Panel File Manager
2. **Build fails**: Check Node.js version and memory
3. **Database errors**: Verify credentials and connection string
4. **API errors**: Check environment variables and API keys

---

## ✅ Deployment Checklist

- [ ] Code uploaded to server
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Application built successfully
- [ ] Application started (PM2 or Cloudways)
- [ ] Health check passes (`/api/health`)
- [ ] SSL certificate installed
- [ ] Cron jobs configured
- [ ] Logs monitored
- [ ] Backup strategy in place

---

**Last Updated**: 2025-01-23
**Version**: 1.0.0
**Status**: Ready for Production Deployment
