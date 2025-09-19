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

// Import wallet adapter CSS
require("@solana/wallet-adapter-react-ui/styles.css");

interface Poll {
  id: string;
  topic: string;
  options: string[];
  startAt: string;
  endAt: string;
  tokenCA?: string;
  results: Array<{
    option: string;
    count: number;
  }>;
  totalVotes: number;
}

const wallets = [new PhantomWalletAdapter()];

function PollContent() {
  const params = useParams();
  const { publicKey, signMessage } = useWallet();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState("");
  const [userVote, setUserVote] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [tokenBalance, setTokenBalance] = useState<{
    hasToken: boolean;
    balance: number;
    loading: boolean;
  }>({ hasToken: false, balance: 0, loading: false });

  useEffect(() => {
    if (params.id) {
      fetchPoll();
    }
  }, [params.id]);

  useEffect(() => {
    if (publicKey && poll?.tokenCA) {
      checkTokenBalance();
    }
  }, [publicKey, poll?.tokenCA]);

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

  const checkTokenBalance = async () => {
    if (!publicKey || !poll?.tokenCA) return;

    setTokenBalance(prev => ({ ...prev, loading: true }));
    try {
      const response = await fetch("/api/check-token-balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: publicKey.toString(),
          tokenCA: poll.tokenCA,
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

  const handleVote = async () => {
    if (!publicKey || !signMessage || !selectedChoice) return;

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
          choice: selectedChoice,
          nonce,
          signature: signatureBase64,
        }),
      });

      if (!voteResponse.ok) {
        const errorData = await voteResponse.json();
        throw new Error(errorData.error || "Failed to cast vote");
      }

      setUserVote(selectedChoice);
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
    const hasTokenOrNoRequirement = !poll?.tokenCA || tokenBalance.hasToken;
    
    return isActive && hasWallet && hasntVoted && hasTokenOrNoRequirement;
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
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="flex justify-between items-start mb-6">
          <h1 className="text-3xl font-bold text-gray-900">{poll.topic}</h1>
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

        {poll.tokenCA && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
            <h3 className="text-sm font-medium text-blue-800 mb-2">
              Token Holder Verification
            </h3>
            <p className="text-sm text-blue-700 mb-2">
              This poll is restricted to holders of:{" "}
              <span className="font-mono bg-blue-100 px-2 py-1 rounded text-xs">
                {poll.tokenCA.slice(0, 8)}...{poll.tokenCA.slice(-8)}
              </span>
            </p>
            {publicKey && (
              <div className="text-sm text-blue-700">
                {tokenBalance.loading ? (
                  <span>Checking token balance...</span>
                ) : tokenBalance.hasToken ? (
                  <span className="text-green-700">
                    ✅ You hold {tokenBalance.balance} tokens - You can vote!
                  </span>
                ) : (
                  <span className="text-red-700">
                    ❌ You don't hold this token - Voting restricted
                  </span>
                )}
              </div>
            )}
          </div>
        )}

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
              {poll.options.map((option) => (
                <label
                  key={option}
                  className="flex items-center space-x-3 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="choice"
                    value={option}
                    checked={selectedChoice === option}
                    onChange={(e) => setSelectedChoice(e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-gray-900">{option}</span>
                </label>
              ))}
            </div>
            <button
              onClick={handleVote}
              disabled={!selectedChoice || voting}
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

        {publicKey && status === "active" && poll?.tokenCA && !tokenBalance.hasToken && !tokenBalance.loading && (
          <div className="border-t pt-6">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
              <h3 className="text-sm font-medium text-yellow-800 mb-2">
                Voting Restricted
              </h3>
              <p className="text-sm text-yellow-700">
                This poll is only available to holders of the specified token. 
                You need to hold the token to participate in this vote.
              </p>
            </div>
          </div>
        )}
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
