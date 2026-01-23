"use client";

import { useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { clusterApiUrl } from "@solana/web3.js";

// Import wallet adapter styles
import "@solana/wallet-adapter-react-ui/styles.css";

export default function WalletProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const network = WalletAdapterNetwork.Mainnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  const wallets = useMemo(() => {
    // Phantom is automatically detected as a Standard Wallet (EIP-6963)
    // Binance Wallet and other Standard Wallets are also automatically detected
    // We only need to explicitly add wallets that don't implement the standard
    const walletAdapters = [
      new SolflareWalletAdapter(),
    ];
    
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/31e8ab33-cdb9-4344-9d5a-61d877e5bc6c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'WalletProvider.tsx:32',message:'Wallets initialized',data:{walletCount:walletAdapters.length,wallets:walletAdapters.map(w=>w.name)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    // Standard Wallets (Phantom, Binance Wallet, etc.) are automatically detected
    // and will appear in the wallet selection modal
    return walletAdapters;
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider 
        wallets={wallets} 
        autoConnect={false}
        onError={(error) => {
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/31e8ab33-cdb9-4344-9d5a-61d877e5bc6c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'WalletProvider.tsx:48',message:'WalletProvider error',data:{error:error?.message,errorName:error?.name,errorStack:error?.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B'})}).catch(()=>{});
          // #endregion
          console.error("WalletProvider error:", error);
        }}
      >
        <WalletModalProvider>{children}</WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}
