# Memocracy 🗳️

A decentralized voting platform for Solana token communities. Built with Next.js, TypeScript, and Solana wallet integration.

## 🚀 Features

- **Token-Gated Voting**: Only token holders can create polls and vote
- **Wallet Authentication**: Connect with Phantom and other Solana wallets
- **Real-time Results**: Live voting results with beautiful visualizations
- **Token Community Dashboards**: Dedicated pages for each token community
- **Automatic Token Images**: Downloads and caches token logos from DexScreener
- **Responsive Design**: Modern UI with Tailwind CSS

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: SQLite
- **Blockchain**: Solana (@solana/web3.js, wallet-adapter)
- **Authentication**: Wallet signatures with tweetnacl
- **Token Data**: DexScreener API integration
- **Image Storage**: Local caching system

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Solana wallet (Phantom recommended)

## 🚀 Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/memocracy.git
   cd memocracy
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file:
   ```env
   DATABASE_URL="file:./dev.db"
   NEXTAUTH_SECRET="your-secret-key"
   NEXTAUTH_URL="http://localhost:3000"
   ```

4. **Set up the database**
   ```bash
   npx prisma db push
   npx prisma generate
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🎯 How It Works

### For Token Holders
1. **Connect Wallet**: Use Phantom or other Solana wallets
2. **Create Polls**: Only token holders can create polls for their token community
3. **Vote**: Sign messages to cast votes (1 wallet = 1 vote per poll)
4. **View Results**: Real-time voting results and community statistics

### For Communities
- **Token Dashboard**: Each token gets its own community dashboard
- **Poll Management**: View all polls, results, and voter participation
- **Token Information**: Real-time price, market cap, and trading data
- **Voter Transparency**: See all wallets that have participated

## 🏗️ Project Structure

```
memocracy/
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── (site)/         # Public pages
│   │   ├── admin/          # Poll creation interface
│   │   ├── coin/[ca]/      # Token community dashboards
│   │   └── api/            # API routes
│   ├── components/         # Reusable React components
│   ├── lib/               # Utility functions and configurations
│   └── styles/            # Global styles
├── prisma/                # Database schema and migrations
├── public/                # Static assets
│   └── token-images/      # Cached token logos
└── README.md
```

## 🔧 API Endpoints

- `GET /api/coins` - List all token communities
- `GET /api/coin/[ca]` - Get token community details
- `GET /api/polls` - List all polls
- `POST /api/polls` - Create a new poll
- `GET /api/token-image/[tokenAddress]` - Get token image (with caching)
- `GET /api/user-tokens` - Get user's token holdings

## 🎨 Key Features

### Token Image System
- Automatically downloads token logos from DexScreener
- Caches images locally for fast loading
- Fallback to token symbol initials if no image available

### Voting System
- Cryptographic signature verification
- One vote per wallet per poll
- Real-time result updates
- Transparent voter lists

### Community Dashboards
- Token price and market data
- Poll history and results
- Voter participation tracking
- Beautiful, responsive design

## 🚀 Deployment

The application is ready for deployment on platforms like:
- Vercel (recommended for Next.js)
- Netlify
- Railway
- DigitalOcean App Platform

Make sure to:
1. Set up production environment variables
2. Configure a production database (PostgreSQL recommended)
3. Set up proper CORS and security headers

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Solana Foundation for the amazing blockchain platform
- DexScreener for token data and images
- Next.js team for the excellent framework
- The Solana community for inspiration and support

## 📞 Support

If you have any questions or need help, please:
- Open an issue on GitHub
- Join our community discussions
- Check the documentation

---

**Built with ❤️ for the Solana community**