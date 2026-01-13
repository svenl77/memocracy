"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

interface VoteStats {
  upvotes: number;
  downvotes: number;
  netScore: number;
  totalVotes: number;
}

interface CoinVoteButtonsProps {
  coinMint: string;
  initialStats: VoteStats;
}

export default function CoinVoteButtons({
  coinMint,
  initialStats,
}: CoinVoteButtonsProps) {
  const [stats, setStats] = useState<VoteStats>(initialStats);
  const [userVote, setUserVote] = useState<"UP" | "DOWN" | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const { publicKey, signMessage } = useWallet();
  const { setVisible } = useWalletModal();

  // Fetch user's current vote on mount
  useEffect(() => {
    if (publicKey) {
      fetchUserVote();
    }
  }, [publicKey, coinMint]);

  const fetchUserVote = async () => {
    // TODO: Implement API to get user's current vote
    // For now, we'll rely on local state
  };

  const fetchNonce = async (wallet: string): Promise<string> => {
    const response = await fetch("/api/auth/nonce", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet }),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch nonce");
    }

    const data = await response.json();
    return data.nonce;
  };

  const handleVote = async (vote: "UP" | "DOWN") => {
    // Open wallet connection dialog if not connected
    if (!publicKey || !signMessage) {
      setVisible(true);
      return;
    }

    if (isVoting) return;

    try {
      setIsVoting(true);

      // Get nonce for signature
      const nonce = await fetchNonce(publicKey.toString());

      // Create message to sign
      const message = `Vote ${vote} for coin ${coinMint}\nNonce: ${nonce}`;
      const encodedMessage = new TextEncoder().encode(message);

      // Request signature from wallet
      const signature = await signMessage(encodedMessage);
      const signatureBase64 = Buffer.from(signature).toString("base64");

      // Submit vote to API
      const response = await fetch(`/api/coin-vote/${coinMint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coinMint,
          wallet: publicKey.toString(),
          vote,
          signature: signatureBase64,
          nonce,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        const errorMessage = errorData.error || errorData.message || `Failed to submit vote (${response.status})`;
        throw new Error(errorMessage);
      }

      const result = await response.json();

      // Update UI with new stats
      setStats({
        upvotes: result.upvotes,
        downvotes: result.downvotes,
        netScore: result.netScore,
        totalVotes: result.totalVotes,
      });
      setUserVote(vote);

      // Show success message
      console.log(
        vote === "UP"
          ? "👍 Upvoted! Community sentiment updated."
          : "👎 Downvoted! Community sentiment updated."
      );
    } catch (error: any) {
      console.error("Vote error:", error);
      const errorMessage = error?.message || error?.toString() || "Failed to submit vote";
      console.error("Full error details:", error);
      alert(`Vote failed: ${errorMessage}`);
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <div className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-lg px-4 py-2 border border-gray-200 dark:border-gray-700 shadow-sm">
      <button
        onClick={() => handleVote("UP")}
        disabled={isVoting}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-md font-medium transition-all
          ${
            userVote === "UP"
              ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 ring-2 ring-green-500"
              : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          }
          ${isVoting ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        `}
        title="Upvote - This is a quality project"
      >
        <span className="text-xl">👍</span>
        <span className="text-sm font-semibold">{stats.upvotes}</span>
      </button>

      <div
        className={`
          px-3 py-1.5 rounded-md font-bold text-lg min-w-[60px] text-center
          ${
            stats.netScore > 0
              ? "text-green-600 dark:text-green-400"
              : stats.netScore < 0
              ? "text-red-600 dark:text-red-400"
              : "text-gray-600 dark:text-gray-400"
          }
        `}
        title={`Net Score: ${stats.upvotes} upvotes - ${stats.downvotes} downvotes`}
      >
        {stats.netScore > 0 ? "+" : ""}
        {stats.netScore}
      </div>

      <button
        onClick={() => handleVote("DOWN")}
        disabled={isVoting}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-md font-medium transition-all
          ${
            userVote === "DOWN"
              ? "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 ring-2 ring-red-500"
              : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          }
          ${isVoting ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        `}
        title="Downvote - This is not a quality project"
      >
        <span className="text-xl">👎</span>
        <span className="text-sm font-semibold">{stats.downvotes}</span>
      </button>
    </div>
  );
}
