"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format, addDays } from "date-fns";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import Header from "@/components/Header";

// Import wallet adapter CSS
require("@solana/wallet-adapter-react-ui/styles.css");

// Phantom is auto-registered as Standard Wallet, no need to manually register
const wallets: any[] = [];

// Dynamically import WalletMultiButton to avoid hydration issues
const WalletMultiButton = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

function AdminContent() {
  const { publicKey, disconnect, connected } = useWallet();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"coin" | "poll" | "founding">("coin");
  const [coinMint, setCoinMint] = useState("");
  const [creatingCoin, setCreatingCoin] = useState(false);
  const [coinMessage, setCoinMessage] = useState("");
  const [formData, setFormData] = useState({
    topic: "",
    pollType: "YES_NO" as "YES_NO" | "MULTIPLE_CHOICE",
    allowMultiple: false,
    maxSelections: 1,
    customOptions: [] as string[],
    startAt: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    endAt: format(addDays(new Date(), 7), "yyyy-MM-dd'T'HH:mm"),
    tokenCA: "",
    accessMode: "COIN" as "COIN" | "WALLET",
    coinId: "",
    coinMinHold: "1",
    projectWalletId: "",
    minContributionLamports: "",
    minContributionUSD: "",
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
  const [coins, setCoins] = useState<Array<{
    id: string;
    mint: string;
    symbol: string;
    name: string;
  }>>([]);
  const [projectWallets, setProjectWallets] = useState<Array<{
    id: string;
    address: string;
    label: string;
    coinId: string | null;
    coin: {
      id: string;
      mint: string;
      symbol: string;
      name: string;
    } | null;
  }>>([]);
  const [loadingCoins, setLoadingCoins] = useState(false);
  const [loadingWallets, setLoadingWallets] = useState(false);
  
  // Founding Wallet state
  const [foundingWalletForm, setFoundingWalletForm] = useState({
    label: "",
    tokenCA: "",
    description: "",
    fundingGoalUSD: "",
    fundingGoalLamports: "",
  });
  const [creatingFoundingWallet, setCreatingFoundingWallet] = useState(false);
  const [foundingWalletMessage, setFoundingWalletMessage] = useState("");

  // Fetch user tokens when wallet connects
  useEffect(() => {
    if (publicKey) {
      fetchUserTokens();
    } else {
      setUserTokens([]);
    }
  }, [publicKey]);

  // Fetch coins and project wallets on component mount
  useEffect(() => {
    fetchCoins();
    fetchProjectWallets();
  }, []);

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

  const fetchCoins = async () => {
    setLoadingCoins(true);
    try {
      const response = await fetch("/api/coins");
      if (response.ok) {
        const data = await response.json();
        // Handle both { coins: [...] } and [...] formats
        if (Array.isArray(data)) {
          setCoins(data);
        } else if (data.coins && Array.isArray(data.coins)) {
          setCoins(data.coins);
        } else {
          console.error("Invalid coins data format:", data);
          setCoins([]);
        }
      } else {
        console.error("Failed to fetch coins");
        setCoins([]);
      }
    } catch (error) {
      console.error("Failed to fetch coins:", error);
      setCoins([]);
    } finally {
      setLoadingCoins(false);
    }
  };

  const fetchProjectWallets = async () => {
    setLoadingWallets(true);
    try {
      const response = await fetch("/api/project-wallets");
      if (response.ok) {
        const walletsData = await response.json();
        setProjectWallets(walletsData);
      } else {
        console.error("Failed to fetch project wallets");
        setProjectWallets([]);
      }
    } catch (error) {
      console.error("Failed to fetch project wallets:", error);
      setProjectWallets([]);
    } finally {
      setLoadingWallets(false);
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

  const addCustomOption = () => {
    setFormData(prev => ({
      ...prev,
      customOptions: [...prev.customOptions, ""]
    }));
  };

  const updateCustomOption = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      customOptions: prev.customOptions.map((option, i) => i === index ? value : option)
    }));
  };

  const removeCustomOption = (index: number) => {
    setFormData(prev => ({
      ...prev,
      customOptions: prev.customOptions.filter((_, i) => i !== index)
    }));
  };

  const getPollOptions = () => {
    if (formData.pollType === "YES_NO") {
      return ["Yes", "No"];
    } else {
      return formData.customOptions.filter(option => option.trim() !== "");
    }
  };

  const handleCreateCoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingCoin(true);
    setCoinMessage("");

    if (!coinMint.trim()) {
      setCoinMessage("Please enter a token mint address");
      setCreatingCoin(false);
      return;
    }

    try {
      const response = await fetch("/api/coin/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mint: coinMint.trim() }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create coin");
      }

      const data = await response.json();
      setCoinMessage(`✅ Coin "${data.coin.name}" (${data.coin.symbol}) created successfully! Redirecting...`);
      
      // Redirect to coin page after a short delay
      setTimeout(() => {
        router.push(`/coin/${data.coin.mint}`);
      }, 2000);
    } catch (error) {
      console.error("Failed to create coin:", error);
      setCoinMessage(
        error instanceof Error ? error.message : "Failed to create coin"
      );
      setCreatingCoin(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    // Check if wallet is connected
    if (!publicKey) {
      setMessage("Please connect your wallet to create a poll");
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
          options: getPollOptions(),
          creatorWallet: publicKey.toString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create poll");
      }

      const poll = await response.json();
      
      // Determine redirect URL based on poll type
      let redirectUrl = "";
      if (formData.accessMode === "COIN") {
        redirectUrl = `/coin/${formData.tokenCA}`;
      } else if (formData.accessMode === "WALLET") {
        redirectUrl = `/coin/${publicKey?.toString()}`;
      }
      
      setMessage(`Poll created successfully! Redirecting to dashboard...`);
      
      // Reset form
      setFormData({
        topic: "",
        pollType: "YES_NO",
        allowMultiple: false,
        maxSelections: 1,
        customOptions: [],
        startAt: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        endAt: format(addDays(new Date(), 7), "yyyy-MM-dd'T'HH:mm"),
        tokenCA: "",
        accessMode: "COIN",
        coinId: "",
        coinMinHold: "1",
        projectWalletId: "",
        minContributionLamports: "",
        minContributionUSD: "",
      });
      
      // Redirect to appropriate dashboard after a short delay
      setTimeout(() => {
        router.push(redirectUrl);
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Navigation */}
          <div className="mb-8">
            <div className="flex space-x-4">
              <Link
                href="/admin/wallets"
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Manage Project Wallets
              </Link>
              <Link
                href="/admin/bags-coin"
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors flex items-center gap-2"
              >
                🚀 Create Bags Coin
              </Link>
            </div>
          </div>

      <div className="bg-white rounded-lg shadow-md p-8">
        {/* Tabs */}
        <div className="mb-8 border-b border-gray-200">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab("coin")}
              className={`px-6 py-3 font-semibold transition-all duration-200 border-b-2 ${
                activeTab === "coin"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              ➕ Add Coin
            </button>
            <button
              onClick={() => setActiveTab("poll")}
              className={`px-6 py-3 font-semibold transition-all duration-200 border-b-2 ${
                activeTab === "poll"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              📊 Create Poll
            </button>
            <button
              onClick={() => setActiveTab("founding")}
              className={`px-6 py-3 font-semibold transition-all duration-200 border-b-2 ${
                activeTab === "founding"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              💰 Create Founding Wallet
            </button>
          </div>
        </div>

        {/* Add Coin Tab */}
        {activeTab === "coin" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                ➕ Add Memecoin to Platform
              </h1>
              <p className="text-gray-600 mb-6">
                Add a memecoin to enable community voting, trust score analysis, and community sentiment tracking. 
                You can create polls for this coin after adding it.
              </p>
            </div>

            {coinMessage && (
              <div
                className={`p-4 rounded ${
                  coinMessage.includes("✅") || coinMessage.includes("successfully")
                    ? "bg-green-100 border border-green-400 text-green-700"
                    : "bg-red-100 border border-red-400 text-red-700"
                }`}
              >
                {coinMessage}
              </div>
            )}

            <form onSubmit={handleCreateCoin} className="space-y-6">
              <div>
                <label
                  htmlFor="coinMint"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Token Mint Address (Contract Address) *
                </label>
                <input
                  type="text"
                  id="coinMint"
                  value={coinMint}
                  onChange={(e) => setCoinMint(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  placeholder="Enter Solana token mint address (e.g., EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v)"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  The contract address of the token you want to add. This will create a coin community page with trust score analysis.
                </p>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="text-sm font-semibold text-blue-800 mb-2">
                  ℹ️ What happens when you add a coin?
                </h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Coin is added to the platform and appears in the communities list</li>
                  <li>• Trust score is automatically calculated (security, liquidity, maturity, etc.)</li>
                  <li>• Community can start voting (upvote/downvote) on the coin</li>
                  <li>• You can create polls for this coin community</li>
                  <li>• Analytics and community sentiment tracking is enabled</li>
                </ul>
              </div>

              <button
                type="submit"
                disabled={creatingCoin || !coinMint.trim()}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl font-semibold"
              >
                {creatingCoin ? "Adding Coin..." : "➕ Add Coin"}
              </button>
            </form>
          </div>
        )}

        {/* Create Poll Tab */}
        {activeTab === "poll" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                📊 Create Community Poll
              </h1>
              <p className="text-gray-600 mb-6">
                Create polls for memecoin communities with different access modes: token-gated (COIN) or contribution-gated (WALLET).
              </p>
            </div>

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

          {/* Poll Type Selection */}
          <div className="bg-gradient-to-br from-green-50 to-blue-50 p-6 rounded-xl border border-green-200">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-green-800 mb-2">
                📊 Poll Type
              </h3>
              <p className="text-sm text-green-700">
                Choose the type of poll: simple Yes/No or multiple choice with custom options.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Poll Type
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="pollType"
                      value="YES_NO"
                      checked={formData.pollType === "YES_NO"}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Yes/No Poll (Simple binary choice)</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="pollType"
                      value="MULTIPLE_CHOICE"
                      checked={formData.pollType === "MULTIPLE_CHOICE"}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Multiple Choice (Custom options)</span>
                  </label>
                </div>
              </div>

              {formData.pollType === "MULTIPLE_CHOICE" && (
                <div className="space-y-4">
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="allowMultiple"
                        checked={formData.allowMultiple}
                        onChange={(e) => setFormData(prev => ({ ...prev, allowMultiple: e.target.checked }))}
                        className="mr-2"
                      />
                      <span className="text-sm font-medium text-gray-700">Allow multiple selections</span>
                    </label>
                  </div>

                  {formData.allowMultiple && (
                    <div>
                      <label
                        htmlFor="maxSelections"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Maximum selections per voter
                      </label>
                      <input
                        type="number"
                        id="maxSelections"
                        name="maxSelections"
                        value={formData.maxSelections}
                        onChange={(e) => setFormData(prev => ({ ...prev, maxSelections: parseInt(e.target.value) || 1 }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="1"
                        max={formData.customOptions.length || 10}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Leave empty for no limit
                      </p>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Poll Options
                      </label>
                      <button
                        type="button"
                        onClick={addCustomOption}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                      >
                        + Add Option
                      </button>
                    </div>
                    
                    <div className="space-y-2">
                      {formData.customOptions.map((option, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => updateCustomOption(index, e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder={`Option ${index + 1}`}
                          />
                          <button
                            type="button"
                            onClick={() => removeCustomOption(index)}
                            className="px-2 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                    
                    {formData.customOptions.length === 0 && (
                      <p className="text-sm text-gray-500 italic">
                        Add at least 2 options for your poll
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Access Mode Selection */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-xl border border-blue-200">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">
                🎯 Poll Access Mode
              </h3>
              <p className="text-sm text-blue-700">
                Choose how users can access this poll: token-gated (COIN) or contribution-gated (WALLET).
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="accessMode"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Access Mode *
                </label>
                <select
                  id="accessMode"
                  name="accessMode"
                  value={formData.accessMode}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="COIN">🪙 COIN - Token-gated (holders only)</option>
                  <option value="WALLET">💳 WALLET - Contribution-gated (contributors only)</option>
                </select>
              </div>

              {/* COIN Mode Configuration */}
              {formData.accessMode === "COIN" && (
                <div className="space-y-4 p-4 bg-white rounded-lg border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">
                    🪙 Token Configuration
                  </h4>
                  
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

                  <div>
                    <label
                      htmlFor="coinMinHold"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Minimum Token Hold
                    </label>
                    <input
                      type="text"
                      id="coinMinHold"
                      name="coinMinHold"
                      value={formData.coinMinHold}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Minimum number of tokens required to vote (default: 1)
                    </p>
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
                </div>
              )}

              {/* WALLET Mode Configuration */}
              {formData.accessMode === "WALLET" && (
                <div className="space-y-4 p-4 bg-white rounded-lg border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">
                    💳 Contribution Configuration
                  </h4>
                  
                  {!connected ? (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-700">
                        Connect your wallet to create contribution-gated polls.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Your Project Wallet
                        </label>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-700 font-mono">
                            {publicKey?.toString()}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            This is your connected wallet address. Only you can create polls for this wallet.
                          </p>
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="coinId"
                          className="block text-sm font-medium text-gray-700 mb-2"
                        >
                          Link to Coin Community *
                        </label>
                        {loadingCoins ? (
                          <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center space-x-2">
                            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-gray-600">Loading coins...</span>
                          </div>
                        ) : (
                          <select
                            id="coinId"
                            name="coinId"
                            value={formData.coinId}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          >
                            <option value="">Select a coin community...</option>
                            {Array.isArray(coins) && coins.map((coin) => (
                              <option key={coin.id} value={coin.id}>
                                {coin.name} ({coin.symbol})
                              </option>
                            ))}
                          </select>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          Select the coin community this project wallet belongs to
                        </p>
                      </div>


                      <div>
                        <label
                          htmlFor="minContributionUSD"
                          className="block text-sm font-medium text-gray-700 mb-2"
                        >
                          Minimum Contribution (USD) *
                        </label>
                        <input
                          type="number"
                          id="minContributionUSD"
                          name="minContributionUSD"
                          value={formData.minContributionUSD}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="10.00"
                          step="0.01"
                          min="0"
                          required
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Minimum contribution value in USD (any cryptocurrency accepted)
                        </p>
                      </div>

                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="text-xs text-blue-700">
                          <strong>Note:</strong> This poll will be gated to contributors who have sent at least the minimum USD value 
                          in any cryptocurrency to your wallet address. This creates a project funding wallet within the selected coin community.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-700">
                  <strong>Note:</strong> You must meet the access requirements to create polls. 
                  This ensures polls are created by legitimate community members.
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
              (formData.pollType === "MULTIPLE_CHOICE" && getPollOptions().length < 2) ||
              (formData.accessMode === "COIN" && !formData.tokenCA) ||
              (formData.accessMode === "WALLET" && (!formData.coinId || !formData.minContributionUSD)) ||
              loadingTokens
            }
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            {loading ? "Creating Poll..." : 
             !connected ? "Connect Wallet First" : 
             loadingTokens ? "Loading Tokens..." : 
             (formData.pollType === "MULTIPLE_CHOICE" && getPollOptions().length < 2) ? "Add Poll Options" :
             (formData.accessMode === "COIN" && !formData.tokenCA) ? "Select Token" :
             (formData.accessMode === "WALLET" && !formData.coinId) ? "Select Coin Community" :
             (formData.accessMode === "WALLET" && !formData.minContributionUSD) ? "Set Minimum Contribution" :
             "📊 Create Poll"}
          </button>
        </form>

            <div className="mt-8 p-6 bg-gradient-to-br from-green-50 to-blue-50 border border-green-200 rounded-xl">
              <h3 className="text-sm font-semibold text-green-800 mb-3">
                📋 How to Create Access-Gated Polls
              </h3>
              <ul className="text-sm text-green-700 space-y-2">
                <li className="flex items-start space-x-2">
                  <span className="text-green-600">•</span>
                  <span>First, add a coin to the platform (use the "Add Coin" tab)</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-green-600">•</span>
                  <span>Connect your Solana wallet to authenticate</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-green-600">•</span>
                  <span>Choose access mode: COIN (token-gated) or WALLET (contribution-gated)</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-green-600">•</span>
                  <span>For COIN mode: Select a token from your wallet holdings and set minimum hold requirements</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-green-600">•</span>
                  <span>For WALLET mode: Select a coin community, use your connected wallet as the project wallet, and set minimum USD contribution (any cryptocurrency accepted)</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-green-600">•</span>
                  <span>You must meet the access requirements to create polls (verified automatically)</span>
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
        )}

        {/* Create Founding Wallet Tab */}
        {activeTab === "founding" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                💰 Create Founding Wallet
              </h1>
              <p className="text-gray-600 mb-6">
                Create a founding wallet to enable community funding for specific projects. Contributors can send funds directly to the wallet address, and all transactions are tracked transparently.
              </p>
            </div>

            {foundingWalletMessage && (
              <div
                className={`p-4 rounded-lg ${
                  foundingWalletMessage.includes("successfully")
                    ? "bg-green-100 border border-green-400 text-green-700"
                    : "bg-red-100 border border-red-400 text-red-700"
                }`}
              >
                {foundingWalletMessage}
              </div>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!publicKey) {
                  setFoundingWalletMessage("Please connect your wallet first");
                  return;
                }

                setCreatingFoundingWallet(true);
                setFoundingWalletMessage("");

                try {
                  if (!publicKey) {
                    throw new Error("Please connect your wallet first");
                  }

                  if (!foundingWalletForm.label || !foundingWalletForm.tokenCA || !foundingWalletForm.description) {
                    throw new Error("Please fill in all required fields");
                  }

                  // Verify that the selected token is in user's holdings
                  const selectedToken = userTokens.find(token => token.mint === foundingWalletForm.tokenCA);
                  if (!selectedToken) {
                    throw new Error("You must select a token that you hold in your wallet");
                  }

                  if (!foundingWalletForm.fundingGoalUSD && !foundingWalletForm.fundingGoalLamports) {
                    throw new Error("Please provide either funding goal in USD or Lamports");
                  }

                  const response = await fetch("/api/founding-wallets", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      address: publicKey.toString(), // Use connected wallet address
                      label: foundingWalletForm.label,
                      tokenCA: foundingWalletForm.tokenCA,
                      description: foundingWalletForm.description,
                      fundingGoalUSD: foundingWalletForm.fundingGoalUSD
                        ? parseFloat(foundingWalletForm.fundingGoalUSD)
                        : undefined,
                      fundingGoalLamports: foundingWalletForm.fundingGoalLamports || undefined,
                      creatorWallet: publicKey.toString(),
                    }),
                  });

                  if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || "Failed to create founding wallet");
                  }

                  const newWallet = await response.json();
                  setFoundingWalletMessage(
                    `✅ Founding wallet "${newWallet.label}" created successfully! Redirecting...`
                  );

                  // Reset form
                  setFoundingWalletForm({
                    label: "",
                    tokenCA: "",
                    description: "",
                    fundingGoalUSD: "",
                    fundingGoalLamports: "",
                  });

                  // Redirect to coin page after a short delay
                  setTimeout(() => {
                    router.push(`/coin/${newWallet.coin.mint}`);
                  }, 2000);
                } catch (error) {
                  console.error("Failed to create founding wallet:", error);
                  setFoundingWalletMessage(
                    error instanceof Error ? error.message : "Failed to create founding wallet"
                  );
                } finally {
                  setCreatingFoundingWallet(false);
                }
              }}
              className="space-y-6"
            >
              {!publicKey ? (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800">
                    ⚠️ Please connect your wallet to create a founding wallet
                  </p>
                </div>
              ) : (
                <>
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      💼 Connected Wallet: <span className="font-mono text-xs">{publicKey.toString().slice(0, 8)}...{publicKey.toString().slice(-8)}</span>
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      This wallet will be used as the founding wallet address where contributors send funds.
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="foundingWalletLabel"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Project Name *
                    </label>
                    <input
                      type="text"
                      id="foundingWalletLabel"
                      value={foundingWalletForm.label}
                      onChange={(e) =>
                        setFoundingWalletForm({ ...foundingWalletForm, label: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Develop new level for SOLLE game"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="foundingWalletTokenCA"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Select Memecoin from Your Holdings *
                    </label>
                    {loadingTokens ? (
                      <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500">
                        Loading your tokens...
                      </div>
                    ) : userTokens.length === 0 ? (
                      <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500">
                        No tokens found in your wallet. Please connect a wallet that holds memecoins.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="text-xs text-gray-600">
                          Found {userTokens.length} token{userTokens.length !== 1 ? 's' : ''} in your wallet
                        </div>
                        <select
                          id="foundingWalletTokenCA"
                          value={foundingWalletForm.tokenCA}
                          onChange={(e) =>
                            setFoundingWalletForm({ ...foundingWalletForm, tokenCA: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        >
                          <option value="">Select a memecoin from your holdings...</option>
                          {userTokens.map((token) => (
                            <option key={token.mint} value={token.mint}>
                              {token.name} ({token.symbol}) - {token.amount.toLocaleString()} tokens
                              {token.price > 0 && ` - $${(token.amount * token.price).toFixed(2)}`}
                            </option>
                          ))}
                        </select>
                        {foundingWalletForm.tokenCA && (
                          (() => {
                            const selectedToken = userTokens.find(token => token.mint === foundingWalletForm.tokenCA);
                            if (selectedToken) {
                              return (
                                <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-green-600">✅</span>
                                    <span className="text-sm text-green-800">
                                      Selected: <strong>{selectedToken.name} ({selectedToken.symbol})</strong>
                                    </span>
                                  </div>
                                  <div className="text-xs text-green-700 mt-1">
                                    Balance: {selectedToken.amount.toLocaleString()} tokens
                                    {selectedToken.price > 0 && ` • Value: $${(selectedToken.amount * selectedToken.price).toFixed(2)}`}
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          })()
                        )}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={fetchUserTokens}
                      disabled={loadingTokens}
                      className="mt-2 text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                    >
                      {loadingTokens ? "Loading..." : "🔄 Refresh Token List"}
                    </button>
                  </div>
                </>
              )}

              <div>
                <label
                  htmlFor="foundingWalletDescription"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Project Description *
                </label>
                <textarea
                  id="foundingWalletDescription"
                  value={foundingWalletForm.description}
                  onChange={(e) =>
                    setFoundingWalletForm({ ...foundingWalletForm, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder="Describe your project and what you want to achieve with the funding..."
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Minimum 10 characters. Be clear about your goals and how the funds will be used.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="foundingWalletGoalUSD"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Funding Goal (USD) *
                  </label>
                  <input
                    type="number"
                    id="foundingWalletGoalUSD"
                    value={foundingWalletForm.fundingGoalUSD}
                    onChange={(e) =>
                      setFoundingWalletForm({
                        ...foundingWalletForm,
                        fundingGoalUSD: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 1000"
                    step="0.01"
                    min="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    💵 Wie viel Geld (in US-Dollar) möchtest du für dieses Projekt sammeln?
                    <br />
                    Beispiel: 1000 = $1.000 USD
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="foundingWalletGoalLamports"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Funding Goal (SOL) - Optional
                  </label>
                  <input
                    type="number"
                    id="foundingWalletGoalLamports"
                    value={foundingWalletForm.fundingGoalLamports ? (parseInt(foundingWalletForm.fundingGoalLamports) / 1_000_000_000).toString() : ""}
                    onChange={(e) => {
                      // Convert SOL to Lamports (1 SOL = 1,000,000,000 Lamports)
                      const solValue = parseFloat(e.target.value) || 0;
                      const lamports = Math.floor(solValue * 1_000_000_000).toString();
                      setFoundingWalletForm({
                        ...foundingWalletForm,
                        fundingGoalLamports: lamports,
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 1.5"
                    step="0.1"
                    min="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    💎 Optional: Du kannst auch ein Ziel in SOL (Solana) angeben.
                    <br />
                    <strong>1 SOL = 1.000.000.000 Lamports</strong> (Lamports sind die kleinste Einheit, wie Cents bei Euro)
                    {foundingWalletForm.fundingGoalLamports && (
                      <span className="block mt-1 text-blue-600">
                        = {parseInt(foundingWalletForm.fundingGoalLamports).toLocaleString()} Lamports
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>💡 Info:</strong> Das USD-Ziel ist <strong>erforderlich</strong>. 
                  Das SOL-Ziel ist <strong>optional</strong> und kann verwendet werden, wenn du Beiträge in SOL akzeptieren möchtest.
                  <br />
                  <span className="text-xs">Beispiel: Du willst $1.000 sammeln. Das entspricht etwa 1.5 SOL (je nach SOL-Preis).</span>
                </p>
              </div>

              <button
                type="submit"
                disabled={creatingFoundingWallet || !publicKey || !foundingWalletForm.tokenCA}
                className={`w-full px-6 py-3 rounded-xl font-semibold text-lg transition-all transform ${
                  creatingFoundingWallet || !connected
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 active:scale-95 shadow-lg hover:shadow-xl"
                } text-white`}
              >
                {creatingFoundingWallet ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin h-5 w-5"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Creating Founding Wallet...
                  </span>
                ) : (
                  "💰 Create Founding Wallet"
                )}
              </button>
            </form>

            <div className="mt-8 p-6 bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-xl">
              <h3 className="text-sm font-semibold text-purple-800 mb-3">
                💡 What happens when you create a Founding Wallet?
              </h3>
              <ul className="text-sm text-purple-700 space-y-2">
                <li className="flex items-start space-x-2">
                  <span className="text-purple-600">•</span>
                  <span>Wallet is added to the platform and appears on the coin's page</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-purple-600">•</span>
                  <span>System automatically monitors the wallet for incoming transactions</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-purple-600">•</span>
                  <span>Contributors can send funds directly to the wallet address</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-purple-600">•</span>
                  <span>All transactions are tracked and displayed transparently</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-purple-600">•</span>
                  <span>Contributors can see their contribution history</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-purple-600">•</span>
                  <span>Wallet receives a trust score based on transparency and execution</span>
                </li>
              </ul>
            </div>
          </div>
        )}
          </div>
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
