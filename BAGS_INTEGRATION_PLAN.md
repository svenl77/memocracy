# Bags Integration Plan für Memocracy

## Übersicht

Integration der Bags API für "Bags-Powered Founding Coins" - ein neuer Coin-Typ, der via Bags API gelauncht wird, automatisch Fees generiert und Community Governance ermöglicht.

## Kern-Features

### 1. Bags Coin Creation
- Token Launch via Bags API
- Multiple Founding Wallets bei Creation
- Fee Share Configuration (inkl. 3% Platform Fee)
- Validation: Summe muss 100% ergeben
- Keine nachträglichen Änderungen möglich

### 2. Fee Distribution
- Bags verteilt Fees direkt an alle Wallets (inkl. Platform Wallet)
- Memocracy trackt nur (read-only)
- Transparente Anzeige aller Fee-Distributions

### 3. Community Governance (später)
- Polls für Wallet-Projekte
- Fee Utilization Votes
- Project Proposals

## Architektur

### Database Schema

```prisma
model BagsCoin {
  id                    String   @id @default(cuid())
  tokenMint             String   @unique // Bags Token Mint
  tokenName             String
  tokenSymbol           String
  description           String?
  image                 String?
  
  // Bags API Integration
  bagsLaunchTxSignature String?  // Token Launch Transaction
  bagsFeeShareConfigTxSignature String? // Fee Share Config Transaction
  
  // Platform Fee
  platformFeePercentage Float    @default(0.03) // 3%
  platformWallet        String   // Memocracy Platform Wallet
  
  // Relations
  foundingWallets       BagsFoundingWallet[]
  polls                 Poll[] // Community Polls
  createdAt             DateTime @default(now())
  createdBy             String   // Wallet that created
  
  @@index([tokenMint])
  @@index([createdBy])
}

model BagsFoundingWallet {
  id                String   @id @default(cuid())
  bagsCoinId        String
  bagsCoin          BagsCoin @relation(fields: [bagsCoinId], references: [id], onDelete: Cascade)
  
  // Wallet Info
  label             String   // e.g., "Development", "Marketing"
  description       String?
  walletAddress     String   // Where fees are sent (direct from Bags)
  feeSharePercentage Float   // e.g., 0.60 = 60%
  
  // Funding (optional)
  fundingGoalUSD    Float?
  currentBalanceUSD Float   @default(0) // From contributions (not fees)
  
  // Status
  status            String   @default("ACTIVE") // ACTIVE, COMPLETED, CANCELLED
  
  // Fee Tracking (read-only from Bags API)
  lifetimeFees      Float   @default(0) // From Bags Analytics API
  lastFeeUpdate     DateTime?
  
  // Relations
  contributors      BagsWalletContributor[]
  transactions      BagsWalletTransaction[]
  polls             Poll[] // Polls for this wallet
  createdAt         DateTime @default(now())
  
  @@index([bagsCoinId])
  @@index([walletAddress])
}

model BagsWalletContributor {
  id                String   @id @default(cuid())
  foundingWalletId  String
  foundingWallet    BagsFoundingWallet @relation(fields: [foundingWalletId], references: [id], onDelete: Cascade)
  
  walletAddress     String
  totalContributedUSD Float  @default(0)
  totalContributedLamports String @default("0")
  contributionCount Int      @default(0)
  firstContributionAt DateTime
  lastContributionAt DateTime
  
  @@unique([foundingWalletId, walletAddress])
  @@index([foundingWalletId])
  @@index([walletAddress])
}

model BagsWalletTransaction {
  id                String   @id @default(cuid())
  foundingWalletId  String
  foundingWallet    BagsFoundingWallet @relation(fields: [foundingWalletId], references: [id], onDelete: Cascade)
  
  signature         String   @unique
  fromWallet        String
  toWallet          String
  amountLamports    String
  amountUSD         Float?
  transactionType   String   // DEPOSIT, WITHDRAWAL, REFUND
  memo              String?
  projectIdFromMemo String?
  blockTime         Int?
  createdAt         DateTime @default(now())
  
  @@index([foundingWalletId])
  @@index([signature])
}

model BagsFeeAnalytics {
  id                String   @id @default(cuid())
  bagsCoinId        String
  bagsCoin          BagsCoin @relation(fields: [bagsCoinId], references: [id], onDelete: Cascade)
  
  // From Bags Analytics API
  lifetimeFees      Float    @default(0)
  totalVolume       Float?
  totalTrades       Int?
  
  // Per Wallet Distribution (calculated)
  walletDistributions JSON?  // { walletId: amount, ... }
  
  lastUpdated       DateTime @default(now())
  nextUpdateAt      DateTime // For cron scheduling
  
  @@unique([bagsCoinId])
  @@index([lastUpdated])
}
```

### API Routes

#### Bags Coin Management

```
POST /api/bags/coins
- Create new Bags Coin
- Launch token via Bags API
- Create fee share config
- Register in Memocracy

GET /api/bags/coins
- List all Bags Coins
- Filter, sort, pagination

GET /api/bags/coins/:tokenMint
- Get Bags Coin details
- Include founding wallets, analytics

PUT /api/bags/coins/:tokenMint
- Update coin info (name, description, image)
- Cannot change fee distribution
```

#### Founding Wallets

```
GET /api/bags/coins/:tokenMint/wallets
- List all founding wallets for coin

GET /api/bags/coins/:tokenMint/wallets/:id
- Get founding wallet details
- Include contributors, transactions, fees

POST /api/bags/coins/:tokenMint/wallets/:id/scan
- Scan for new transactions
- Update balance
```

#### Fee Analytics

```
GET /api/bags/coins/:tokenMint/analytics
- Get fee analytics from Bags API
- Lifetime fees, volume, trades
- Per-wallet distribution

POST /api/cron/sync-bags-fees
- Cron job to sync fees from Bags API
- Update all Bags Coins
```

#### Bags API Integration

```
POST /api/bags/internal/create-token
- Internal: Create token via Bags API
- Returns: tokenMint, launchTxSignature

POST /api/bags/internal/create-fee-share
- Internal: Create fee share config
- Returns: configTxSignature

GET /api/bags/internal/analytics/:tokenMint
- Internal: Get analytics from Bags API
- Returns: lifetime fees, volume, etc.
```

### Library Functions

#### `src/lib/bagsApi.ts`

```typescript
// Bags API Client
export class BagsApiClient {
  private apiKey: string;
  private baseUrl: string;
  
  // Token Launch
  async createTokenInfo(metadata: TokenMetadata): Promise<TokenInfo>
  async createTokenLaunch(params: LaunchParams): Promise<LaunchResult>
  
  // Fee Share
  async createFeeShareConfig(params: FeeShareParams): Promise<FeeShareResult>
  async getFeeShareWallet(tokenMint: string): Promise<FeeShareInfo>
  
  // Analytics
  async getTokenLifetimeFees(tokenMint: string): Promise<LifetimeFees>
  async getTokenCreators(tokenMint: string): Promise<Creators>
  async getTokenClaimStats(tokenMint: string): Promise<ClaimStats>
}
```

#### `src/lib/bagsCoinManager.ts`

```typescript
// High-level Bags Coin Management
export async function createBagsCoin(params: CreateBagsCoinParams): Promise<BagsCoin>
export async function getBagsCoinAnalytics(tokenMint: string): Promise<BagsAnalytics>
export async function syncBagsCoinFees(tokenMint: string): Promise<void>
export async function validateFeeDistribution(wallets: WalletConfig[]): Promise<boolean>
```

## User Flows

### Flow 1: Create Bags Coin

```
1. User navigates to "Create Bags Coin"
2. Step 1: Basic Info
   - Token Name
   - Token Symbol
   - Description
   - Image (optional)
3. Step 2: Founding Wallets Setup
   - Add Wallet 1: Label, Description, Percentage
   - Add Wallet 2: Label, Description, Percentage
   - Add Wallet 3: ...
   - Platform Fee: 3% (fixed, shown)
   - Validation: Total = 100%
4. Step 3: Review
   - Preview fee distribution
   - Show all wallets
   - Confirm
5. Step 4: Launch
   - Connect wallet
   - Sign transactions:
     a. Token Launch Transaction
     b. Fee Share Config Transaction
   - Wait for confirmation
   - Redirect to coin dashboard
```

### Flow 2: View Bags Coin

```
1. User views Bags Coin Dashboard
2. See Token Info
   - Name, Symbol, Image
   - Lifetime Fees (from Bags)
   - Trading Volume
3. See Fee Distribution
   - Wallet 1: 60% → $X fees received
   - Wallet 2: 20% → $Y fees received
   - Platform: 3% → $Z fees received
4. See Founding Wallets
   - List all wallets
   - Funding progress
   - Contributors
   - Polls
```

### Flow 3: Contribute to Founding Wallet

```
1. User views Founding Wallet
2. See wallet details
   - Label, Description
   - Funding Goal
   - Current Balance
   - Lifetime Fees (from Bags)
3. Click "Contribute"
4. Get payment link (Solana Pay)
5. Send SOL/USDC with memo
6. Transaction tracked automatically
```

## Environment Variables

```env
# Bags API
BAGS_API_KEY=your_api_key_here
BAGS_API_BASE_URL=https://public-api-v2.bags.fm/api/v1

# Platform Wallet
MEMOCRACY_PLATFORM_WALLET=7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
MEMOCRACY_PLATFORM_FEE_PERCENTAGE=0.03

# Fee Sync
BAGS_FEE_SYNC_INTERVAL=3600000 # 1 hour in ms
```

## Implementation Phases

### Phase 1: Core Infrastructure
1. ✅ Bags API Client Library
2. ✅ Database Schema (Prisma)
3. ✅ Environment Variables
4. ✅ Basic API Routes

### Phase 2: Coin Creation
1. ✅ Create Token via Bags API
2. ✅ Create Fee Share Config
3. ✅ Register in Database
4. ✅ Validation Logic

### Phase 3: UI - Coin Creation
1. ✅ Multi-step Form
2. ✅ Wallet Builder
3. ✅ Fee Distribution Preview
4. ✅ Transaction Signing Flow

### Phase 4: Coin Dashboard
1. ✅ Token Info Display
2. ✅ Fee Analytics Integration
3. ✅ Founding Wallets List
4. ✅ Fee Distribution Visualization

### Phase 5: Wallet Management
1. ✅ Wallet Detail Pages
2. ✅ Transaction Tracking
3. ✅ Contributor Management
4. ✅ Payment Links

### Phase 6: Fee Sync
1. ✅ Cron Job for Fee Updates
2. ✅ Bags Analytics API Integration
3. ✅ Per-Wallet Fee Calculation
4. ✅ Update Database

### Phase 7: UI Polish
1. ✅ Bags Coin Badge/Indicator
2. ✅ Separate "Bags Coins" Section
3. ✅ Filtering & Search
4. ✅ Analytics Dashboard

## Validation Rules

### Fee Distribution
- Sum of all wallet percentages + platform fee = 100%
- Minimum 1 wallet required
- Maximum wallets: TBD (check Bags limit)
- Each wallet: 0% < percentage < 100%
- Platform fee: Fixed at 3%

### Token Creation
- Token name: 1-32 characters
- Token symbol: 1-10 characters
- Unique token mint (Bags validates)
- Valid wallet addresses

## Error Handling

### Bags API Errors
- Rate limiting: Retry with exponential backoff
- Invalid parameters: Clear error messages
- Transaction failures: Show transaction signature
- Network errors: Retry logic

### User Errors
- Invalid fee distribution: Show validation errors
- Missing wallet: Clear error message
- Transaction rejection: Allow retry

## Security Considerations

1. **API Key Security**
   - Store in environment variables
   - Never expose to client
   - Rotate regularly

2. **Transaction Signing**
   - User must sign all transactions
   - No server-side signing
   - Clear transaction preview

3. **Fee Distribution**
   - Validate on server
   - Cannot be changed after creation
   - Transparent in UI

4. **Platform Wallet**
   - Single wallet for all fees
   - Transparent tracking
   - Regular audits

## Testing Strategy

1. **Unit Tests**
   - Fee distribution validation
   - Bags API client methods
   - Database operations

2. **Integration Tests**
   - Full coin creation flow
   - Fee sync process
   - Transaction tracking

3. **E2E Tests**
   - User creates Bags Coin
   - User contributes to wallet
   - Fee sync updates

## Documentation

1. **API Documentation**
   - All endpoints documented
   - Request/response examples
   - Error codes

2. **User Guide**
   - How to create Bags Coin
   - How to set up wallets
   - How fees work

3. **Developer Guide**
   - Bags API integration
   - Database schema
   - Extension points

## Future Enhancements

1. **Community Governance**
   - Polls for wallet projects
   - Fee utilization votes
   - Project proposals

2. **Advanced Analytics**
   - Fee trends
   - Wallet performance
   - Community engagement

3. **Templates**
   - Pre-configured wallet setups
   - Common distributions
   - Best practices

## Notes

- Platform Fee: 3% (fixed, can be adjusted later)
- Platform Wallet: Single wallet for all fees
- Fee Distribution: Immutable after creation
- Bags API: All fees distributed directly by Bags
- Memocracy: Read-only tracking, no money holding
