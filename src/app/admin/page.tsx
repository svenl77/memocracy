"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { format, addDays } from "date-fns";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import { useWallet } from "@solana/wallet-adapter-react";

// Import wallet adapter CSS
require("@solana/wallet-adapter-react-ui/styles.css");

const wallets = [new PhantomWalletAdapter()];

// Dynamically import WalletMultiButton to avoid hydration issues
const WalletMultiButton = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

function AdminContent() {
  const { publicKey, disconnect, connected } = useWallet();
  const router = useRouter();
  const [formData, setFormData] = useState({
    topic: "",
    startAt: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    endAt: format(addDays(new Date(), 7), "yyyy-MM-dd'T'HH:mm"),
    tokenCA: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [tokenBalance, setTokenBalance] = useState<{
    hasToken: boolean;
    balance: number;
    loading: boolean;
  }>({ hasToken: false, balance: 0, loading: false });
  const [userTokens, setUserTokens] = useState<Array<{
    mint: string;
    amount: number;
    name: string;
    symbol: string;
    price: number;
    priceChange24h: number;
    marketCap: number;
    volume24h: number;
  }>>([]);
  const [loadingTokens, setLoadingTokens] = useState(false);

  // Fetch user tokens when wallet connects
  useEffect(() => {
    if (publicKey) {
      fetchUserTokens();
    } else {
      setUserTokens([]);
    }
  }, [publicKey]);

  // Check token balance when tokenCA changes
  useEffect(() => {
    if (publicKey && formData.tokenCA) {
      checkTokenBalance();
    }
  }, [publicKey, formData.tokenCA]);

  const fetchUserTokens = async () => {
    if (!publicKey) return;

    setLoadingTokens(true);
    try {
      const response = await fetch("/api/user-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: publicKey.toString(),
        }),
      });

      if (response.ok) {
        const tokens = await response.json();
        setUserTokens(tokens);
      } else {
        console.error("Failed to fetch user tokens");
        setUserTokens([]);
      }
    } catch (error) {
      console.error("Failed to fetch user tokens:", error);
      setUserTokens([]);
    } finally {
      setLoadingTokens(false);
    }
  };

  const checkTokenBalance = async () => {
    if (!publicKey || !formData.tokenCA) return;

    setTokenBalance(prev => ({ ...prev, loading: true }));
    try {
      const response = await fetch("/api/check-token-balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: publicKey.toString(),
          tokenCA: formData.tokenCA,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setTokenBalance({
          hasToken: data.hasToken,
          balance: data.balance,
          loading: false,
        });
      } else {
        setTokenBalance(prev => ({ ...prev, loading: false }));
      }
    } catch (error) {
      console.error("Failed to check token balance:", error);
      setTokenBalance(prev => ({ ...prev, loading: false }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    // Check if wallet is connected
    if (!publicKey) {
      setMessage("Please connect your wallet to create polls");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/polls", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          options: ["Yes", "No"],
          tokenCA: formData.tokenCA,
          creatorWallet: publicKey.toString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create poll");
      }

      const poll = await response.json();
      const tokenCA = formData.tokenCA; // Store tokenCA before resetting form
      setMessage(`Poll created successfully! Redirecting to coin dashboard...`);
      
      // Reset form
      setFormData({
        topic: "",
        startAt: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        endAt: format(addDays(new Date(), 7), "yyyy-MM-dd'T'HH:mm"),
        tokenCA: "",
      });
      
      // Redirect to coin dashboard after a short delay
      setTimeout(() => {
        router.push(`/coin/${tokenCA}`);
      }, 2000);
    } catch (error) {
      console.error("Failed to create poll:", error);
      setMessage(
        error instanceof Error ? error.message : "Failed to create poll"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Create New Poll
        </h1>
        <p className="text-gray-600 mb-6">
          Connect your wallet and create token-gated polls for your community. You must hold the specified token to create and vote on polls.
        </p>

        {/* Wallet Connection */}
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
          <h3 className="text-sm font-semibold text-blue-800 mb-3">Wallet Connection</h3>
          <div className="flex justify-center">
            <WalletMultiButton className="!bg-gradient-to-r !from-blue-600 !to-purple-600 hover:!from-blue-700 hover:!to-purple-700 !rounded-xl !shadow-lg hover:!shadow-xl !transition-all !duration-200" />
          </div>
          {connected && publicKey && (
            <div className="mt-3 text-center space-y-2">
              <p className="text-xs text-blue-700">
                Connected: {publicKey.toString().slice(0, 8)}...{publicKey.toString().slice(-8)}
              </p>
              <button
                onClick={disconnect}
                className="text-xs text-red-600 hover:text-red-800 underline"
              >
                Switch Wallet
              </button>
            </div>
          )}
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded ${
              message.includes("successfully")
                ? "bg-green-100 border border-green-400 text-green-700"
                : "bg-red-100 border border-red-400 text-red-700"
            }`}
          >
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">

          <div>
            <label
              htmlFor="topic"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Poll Topic
            </label>
            <input
              type="text"
              id="topic"
              name="topic"
              value={formData.topic}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Should we implement feature X?"
              required
            />
          </div>


          <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-xl border border-blue-200">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">
                🪙 Token Community Poll
              </h3>
              <p className="text-sm text-blue-700">
                All polls are token-gated. You must hold the specified token to create and vote on polls.
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    htmlFor="tokenCA"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Select Token from Your Holdings *
                  </label>
                  {connected && (
                    <button
                      type="button"
                      onClick={fetchUserTokens}
                      disabled={loadingTokens}
                      className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                    >
                      {loadingTokens ? "Loading..." : "🔄 Refresh"}
                    </button>
                  )}
                </div>
                
                {!connected ? (
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500">
                    Connect your wallet to see your tokens
                  </div>
                ) : loadingTokens ? (
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-gray-600">Loading your tokens...</span>
                  </div>
                ) : userTokens.length === 0 ? (
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500">
                    No tokens found in your wallet
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-xs text-gray-600">
                      Found {userTokens.length} token{userTokens.length !== 1 ? 's' : ''} in your wallet
                    </div>
                  <select
                    id="tokenCA"
                    name="tokenCA"
                    value={formData.tokenCA}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select a token...</option>
                    {userTokens.map((token) => (
                      <option key={token.mint} value={token.mint}>
                        {token.name} ({token.symbol}) - {token.amount.toLocaleString()} tokens
                        {token.price > 0 && ` - $${(token.amount * token.price).toFixed(2)}`}
                      </option>
                    ))}
                  </select>
                  </div>
                )}
                
                {formData.tokenCA && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 font-mono">
                      Contract: {formData.tokenCA}
                    </p>
                  </div>
                )}
              </div>

              {/* Token Holder Verification */}
              {connected && formData.tokenCA && (
                <div className="p-4 bg-white rounded-lg border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">
                    Token Holder Verification
                  </h4>
                  
                  {(() => {
                    const selectedToken = userTokens.find(token => token.mint === formData.tokenCA);
                    
                    if (selectedToken) {
                      return (
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs">✓</span>
                            </div>
                            <span className="text-sm text-green-700 font-medium">
                              ✅ You hold {selectedToken.amount.toLocaleString()} {selectedToken.symbol} tokens
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <p className="text-gray-600">Token Value:</p>
                              <p className="font-semibold">
                                ${(selectedToken.amount * selectedToken.price).toFixed(2)}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-600">Price:</p>
                              <p className="font-semibold">
                                ${selectedToken.price.toFixed(6)}
                                {selectedToken.priceChange24h !== 0 && (
                                  <span className={`ml-1 ${selectedToken.priceChange24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    ({selectedToken.priceChange24h >= 0 ? '+' : ''}{selectedToken.priceChange24h.toFixed(2)}%)
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    
                    return (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm text-gray-600">Verifying token ownership...</span>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-700">
                  <strong>Note:</strong> Only token holders can create polls for their community. 
                  This prevents misuse and ensures polls are created by legitimate community members.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="startAt"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Start Date & Time
              </label>
              <input
                type="datetime-local"
                id="startAt"
                name="startAt"
                value={formData.startAt}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label
                htmlFor="endAt"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                End Date & Time
              </label>
              <input
                type="datetime-local"
                id="endAt"
                name="endAt"
                value={formData.endAt}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-md">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Poll Options
            </h3>
            <p className="text-sm text-gray-600">
              This poll will have two options: <strong>Yes</strong> and{" "}
              <strong>No</strong>
            </p>
          </div>

          <button
            type="submit"
            disabled={
              loading || 
              !connected ||
              !formData.tokenCA ||
              loadingTokens
            }
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            {loading ? "Creating Poll..." : !connected ? "Connect Wallet First" : loadingTokens ? "Loading Tokens..." : !formData.tokenCA ? "Select Token" : "Create Poll"}
          </button>
        </form>

        <div className="mt-8 p-6 bg-gradient-to-br from-green-50 to-blue-50 border border-green-200 rounded-xl">
          <h3 className="text-sm font-semibold text-green-800 mb-3">
            📋 How to Create Token-Gated Polls
          </h3>
          <ul className="text-sm text-green-700 space-y-2">
            <li className="flex items-start space-x-2">
              <span className="text-green-600">•</span>
              <span>Connect your Solana wallet to authenticate</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-green-600">•</span>
              <span>Select a token from your wallet holdings</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-green-600">•</span>
              <span>You must hold the token to create polls (verified automatically)</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-green-600">•</span>
              <span>Use a valid Solana wallet address for the target wallet</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-green-600">•</span>
              <span>Ensure the end date is after the start date</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-green-600">•</span>
              <span>All polls are public and can be viewed by anyone</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <ConnectionProvider endpoint="https://api.mainnet-beta.solana.com">
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <AdminContent />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
