"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import Header from "@/components/Header";

// Import wallet adapter CSS
require("@solana/wallet-adapter-react-ui/styles.css");

interface Poll {
  id: string;
  topic: string;
  options: string[];
  pollType: string;
  allowMultiple: boolean;
  maxSelections?: number;
  startAt: string;
  endAt: string;
  tokenCA?: string;
  accessMode: string;
  coin?: {
    id: string;
    mint: string;
    symbol: string;
    name: string;
  };
  coinMinHold?: string;
  projectWallet?: {
    id: string;
    address: string;
    label: string;
    coinId?: string;
    coin?: {
      id: string;
      mint: string;
      symbol: string;
      name: string;
    };
  };
  minContributionLamports?: string;
  contributionMint?: string;
  results: Array<{
    option: string;
    count: number;
  }>;
  totalVotes: number;
}

const wallets = [new PhantomWalletAdapter()];

function PollContent() {
  const params = useParams();
  const { publicKey, signMessage, disconnect } = useWallet();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<string[]>([]);
  const [userVote, setUserVote] = useState<string | string[] | null>(null);
  const [error, setError] = useState("");
  const [tokenBalance, setTokenBalance] = useState<{
    hasToken: boolean;
    balance: number;
    loading: boolean;
  }>({ hasToken: false, balance: 0, loading: false });
  const [eligibility, setEligibility] = useState<{
    eligible: boolean;
    reasons: string[];
    isFoundingWallet?: boolean;
    loading: boolean;
  }>({ eligible: false, reasons: [], loading: false });

  useEffect(() => {
    if (params.id) {
      fetchPoll();
    }
  }, [params.id]);

  useEffect(() => {
    if (publicKey && poll) {
      checkEligibility();
    }
  }, [publicKey, poll]);

  const fetchPoll = async () => {
    try {
      const response = await fetch(`/api/polls/${params.id}`);
      const data = await response.json();
      setPoll(data);
    } catch (error) {
      console.error("Failed to fetch poll:", error);
      setError("Failed to load poll");
    } finally {
      setLoading(false);
    }
  };

  const checkEligibility = async () => {
    if (!publicKey || !poll) return;

    setEligibility(prev => ({ ...prev, loading: true }));
    try {
      const response = await fetch(`/api/polls/${poll.id}/eligibility?wallet=${publicKey.toString()}`);
      
      if (response.ok) {
        const data = await response.json();
        setEligibility({
          eligible: data.eligible,
          reasons: data.reasons,
          loading: false,
        });
      } else {
        setEligibility({
          eligible: false,
          reasons: ["Failed to check eligibility"],
          loading: false,
        });
      }
    } catch (error) {
      console.error("Failed to check eligibility:", error);
      setEligibility({
        eligible: false,
        reasons: ["Failed to check eligibility"],
        loading: false,
      });
    }
  };

  const handleVote = async () => {
    if (!publicKey || !signMessage || selectedChoice.length === 0) return;

    setVoting(true);
    setError("");

    try {
      // Get nonce
      const nonceResponse = await fetch("/api/auth/nonce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: publicKey.toString() }),
      });
      const { nonce } = await nonceResponse.json();

      // Sign message
      const message = `SOLANA_VOTE_LOGIN:${nonce}`;
      const encodedMessage = new TextEncoder().encode(message);
      const signature = await signMessage(encodedMessage);
      const signatureBase64 = Buffer.from(signature).toString("base64");

      // Verify signature and get session
      await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: publicKey.toString(),
          nonce,
          signature: signatureBase64,
        }),
      });

      // Cast vote
      const voteResponse = await fetch(`/api/polls/${params.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          choice: poll?.allowMultiple ? selectedChoice : selectedChoice[0],
          nonce,
          signature: signatureBase64,
        }),
      });

      if (!voteResponse.ok) {
        const errorData = await voteResponse.json();
        throw new Error(errorData.error || "Failed to cast vote");
      }

      setUserVote(poll?.allowMultiple ? selectedChoice : selectedChoice[0]);
      await fetchPoll(); // Refresh poll data
    } catch (error) {
      console.error("Voting error:", error);
      setError(error instanceof Error ? error.message : "Failed to cast vote");
    } finally {
      setVoting(false);
    }
  };

  const getPollStatus = () => {
    if (!poll) return "loading";
    const now = new Date();
    const startAt = new Date(poll.startAt);
    const endAt = new Date(poll.endAt);

    if (now < startAt) return "upcoming";
    if (now > endAt) return "ended";
    return "active";
  };

  const canVote = () => {
    const isActive = getPollStatus() === "active";
    const hasWallet = !!publicKey;
    const hasntVoted = !userVote;
    const isEligible = eligibility.eligible;
    
    return isActive && hasWallet && hasntVoted && isEligible;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading poll...</div>
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 text-lg">Poll not found</p>
      </div>
    );
  }

  const status = getPollStatus();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{poll.topic}</h1>
            <div className="flex items-center space-x-2 mt-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                poll.pollType === "YES_NO" 
                  ? "bg-blue-100 text-blue-800" 
                  : "bg-purple-100 text-purple-800"
              }`}>
                {poll.pollType === "YES_NO" ? "📊 Yes/No Poll" : "📋 Multiple Choice"}
              </span>
              {poll.allowMultiple && (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  ✓ Multiple Selection
                  {poll.maxSelections && ` (max ${poll.maxSelections})`}
                </span>
              )}
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              status === "active"
                ? "bg-green-100 text-green-800"
                : status === "upcoming"
                ? "bg-yellow-100 text-yellow-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {status}
          </span>
        </div>

        <div className="mb-6">
          <p className="text-gray-600">
            {format(new Date(poll.startAt), "MMM d, yyyy 'at' h:mm a")} -{" "}
            {format(new Date(poll.endAt), "MMM d, yyyy 'at' h:mm a")}
          </p>
        </div>

        {/* Gate Badges */}
        <div className="mb-6 space-y-3">
          {poll.accessMode === "COIN" && poll.coin && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded">
              <h3 className="text-sm font-medium text-blue-800 mb-2">
                🪙 Coin Gate
              </h3>
              <p className="text-sm text-blue-700 mb-2">
                This poll is restricted to holders of: <strong>{poll.coin.name} ({poll.coin.symbol})</strong>
              </p>
              <p className="text-xs text-blue-600">
                Minimum hold: {poll.coinMinHold || "1"} {poll.coin.symbol}
              </p>
            </div>
          )}

          {poll.accessMode === "WALLET" && poll.projectWallet && (
            <div className="p-4 bg-green-50 border border-green-200 rounded">
              <h3 className="text-sm font-medium text-green-800 mb-2">
                💳 Wallet Gate
              </h3>
              <p className="text-sm text-green-700 mb-2">
                This poll is restricted to contributors to: <strong>{poll.projectWallet.label}</strong>
              </p>
              <p className="text-xs text-green-600">
                Minimum contribution: {poll.minContributionLamports ? (parseInt(poll.minContributionLamports) / 1000000000).toFixed(2) : "0"} SOL
              </p>
              {poll.projectWallet.coin && (
                <p className="text-xs text-green-600 mt-1">
                  Also requires: {poll.coinMinHold || "1"} {poll.projectWallet.coin.symbol}
                </p>
              )}
            </div>
          )}

          {/* Eligibility Status */}
          {publicKey && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded">
              <h3 className="text-sm font-medium text-gray-800 mb-2">
                Your Eligibility Status
              </h3>
              <div className="text-xs text-gray-500 mb-2">
                Connected wallet: {publicKey?.toString().slice(0, 8)}...{publicKey?.toString().slice(-8)}
              </div>
              {eligibility.loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm text-gray-600">Checking eligibility...</span>
                </div>
              ) : eligibility.eligible ? (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                    <span className="text-sm text-green-700 font-medium">
                      ✅ You are eligible to vote!
                    </span>
                  </div>
                  {eligibility.isFoundingWallet && (
                    <div className="ml-6 p-2 bg-yellow-50 border border-yellow-200 rounded">
                      <span className="text-xs text-yellow-800 font-medium">
                        👑 Founding Wallet Owner - Special privileges granted
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">✗</span>
                    </div>
                    <span className="text-sm text-red-700 font-medium">
                      ❌ You are not eligible to vote
                    </span>
                  </div>
                  {eligibility.reasons.length > 0 && (
                    <div className="ml-6">
                      <ul className="text-xs text-red-600 space-y-1">
                        {eligibility.reasons.map((reason, index) => (
                          <li key={index}>• {reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Wallet Management & Donation Options */}
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-800 mb-3">
                      💡 How to become eligible:
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-blue-700 font-medium">Switch to a different wallet</p>
                          <p className="text-xs text-blue-600">Connect a wallet that meets the requirements</p>
                        </div>
                        <button
                          onClick={() => {
                            // Trigger wallet disconnect to allow reconnection
                            disconnect();
                          }}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                        >
                          Switch Wallet
                        </button>
                      </div>
                      
                      {poll?.projectWallet && poll?.minContributionUSD && (
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-blue-700 font-medium">Make a donation</p>
                            <p className="text-xs text-blue-600">
                              Contribute ${poll.minContributionUSD} USD to {poll.projectWallet.label}
                            </p>
                          </div>
                          <button
                            onClick={async () => {
                              try {
                                // Copy wallet address to clipboard
                                await navigator.clipboard.writeText(poll.projectWallet.address);
                                // Show a better notification
                                const notification = document.createElement('div');
                                notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
                                notification.textContent = 'Wallet address copied to clipboard!';
                                document.body.appendChild(notification);
                                setTimeout(() => {
                                  document.body.removeChild(notification);
                                }, 3000);
                              } catch (err) {
                                alert(`Wallet address: ${poll.projectWallet.address}`);
                              }
                            }}
                            className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
                          >
                            Copy Address
                          </button>
                        </div>
                      )}
                      
                      {poll?.coin && poll?.coinMinHold && (
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-blue-700 font-medium">Acquire {poll.coin.symbol} tokens</p>
                            <p className="text-xs text-blue-600">
                              Get at least {poll.coinMinHold} {poll.coin.symbol} tokens
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              // Open DEX or token info
                              const dexUrl = `https://dexscreener.com/solana/${poll.coin.mint}`;
                              window.open(dexUrl, '_blank');
                            }}
                            className="px-3 py-1 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 transition-colors"
                          >
                            View on DexScreener
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {userVote && (
          <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
            You voted: <strong>{userVote}</strong>
          </div>
        )}

        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Results</h2>
          <div className="space-y-4">
            {poll.results.map((result) => {
              const percentage = poll.totalVotes > 0 
                ? Math.round((result.count / poll.totalVotes) * 100) 
                : 0;
              
              return (
                <div key={result.option} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{result.option}</span>
                    <span className="text-sm text-gray-600">
                      {result.count} vote{result.count !== 1 ? "s" : ""} ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-sm text-gray-600">
            Total votes: {poll.totalVotes}
          </p>
        </div>

        {canVote() && (
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Cast Your Vote</h3>
            <div className="space-y-3 mb-6">
              {poll.allowMultiple && poll.maxSelections && (
                <div className="text-sm text-gray-600 mb-4 p-3 bg-blue-50 rounded-lg">
                  <strong>Multiple Choice:</strong> You can select up to {poll.maxSelections} option{poll.maxSelections > 1 ? 's' : ''}.
                  {selectedChoice.length > 0 && (
                    <span className="ml-2">({selectedChoice.length}/{poll.maxSelections} selected)</span>
                  )}
                </div>
              )}
              {poll.options.map((option) => (
                <label
                  key={option}
                  className="flex items-center space-x-3 cursor-pointer"
                >
                  <input
                    type={poll.allowMultiple ? "checkbox" : "radio"}
                    name="choice"
                    value={option}
                    checked={poll.allowMultiple ? selectedChoice.includes(option) : selectedChoice[0] === option}
                    onChange={(e) => {
                      if (poll.allowMultiple) {
                        if (e.target.checked) {
                          if (!poll.maxSelections || selectedChoice.length < poll.maxSelections) {
                            setSelectedChoice([...selectedChoice, option]);
                          }
                        } else {
                          setSelectedChoice(selectedChoice.filter(choice => choice !== option));
                        }
                      } else {
                        setSelectedChoice([e.target.value]);
                      }
                    }}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-gray-900">{option}</span>
                </label>
              ))}
            </div>
            <button
              onClick={handleVote}
              disabled={selectedChoice.length === 0 || voting}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {voting ? "Voting..." : "Vote"}
            </button>
          </div>
        )}

        {!publicKey && status === "active" && (
          <div className="border-t pt-6">
            <p className="text-gray-600 mb-4">
              Connect your wallet to vote on this poll
            </p>
            <WalletMultiButton />
          </div>
        )}

        {publicKey && status === "active" && !eligibility.eligible && !eligibility.loading && (
          <div className="border-t pt-6">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
              <h3 className="text-sm font-medium text-yellow-800 mb-2">
                Voting Restricted
              </h3>
              <p className="text-sm text-yellow-700">
                You don't meet the requirements to vote on this poll. 
                Check the eligibility status above for details.
              </p>
            </div>
          </div>
        )}
        </div>
        </div>
      </div>
    </div>
  );
}

export default function PollPage() {
  return (
    <ConnectionProvider endpoint="https://api.mainnet-beta.solana.com">
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <PollContent />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
