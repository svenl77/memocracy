# Background Job Setup for Token Metadata Updates

## Overview
The token metadata update endpoint is available at `/api/cron/update-token-metadata` to keep token data fresh without blocking user requests.

## Setup Options

### Option 1: Vercel Cron (Recommended for Vercel deployments)
Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/update-token-metadata",
    "schedule": "*/5 * * * *"
  }]
}
```

### Option 2: External Cron Service
Use services like:
- **GitHub Actions** (free for public repos)
- **EasyCron** (paid)
- **Cron-job.org** (free tier available)
- **Uptime Robot** (free tier)

Configure to call: `https://your-domain.com/api/cron/update-token-metadata`

### Option 3: Manual Trigger
You can manually trigger updates by calling:
```bash
curl https://your-domain.com/api/cron/update-token-metadata
```

## Security
Set `CRON_SECRET` environment variable and include it in the Authorization header:
```bash
curl -H "Authorization: Bearer YOUR_SECRET" https://your-domain.com/api/cron/update-token-metadata
```

## How It Works
1. Fetches all coins from database
2. Updates tokens in batches of 10 (to avoid rate limiting)
3. Only updates tokens older than 5 minutes
4. Skips tokens that are already fresh
5. Handles errors gracefully and continues with other tokens

## Performance
- **10,000 coins**: ~33 minutes (with 2s delay between batches)
- **Rate limiting**: Built-in delays prevent DexScreener API limits
- **Efficiency**: Only updates stale data (>5 minutes old)
