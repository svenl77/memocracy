"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {
  createLeaderboardMessage,
  normalizeLeaderboardUsername,
} from "@/lib/signingMessages";

require("@solana/wallet-adapter-react-ui/styles.css");

const wallets = [new PhantomWalletAdapter()];

interface LeaderboardEntry {
  id: string;
  rank: number;
  username: string;
  wallet: string;
  score: number;
  updatedAt: string;
}

function shortenAddress(address: string) {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function LeaderboardContent() {
  const searchParams = useSearchParams();
  const { publicKey, signMessage } = useWallet();
  const walletAddress = publicKey?.toString() ?? "";

  const scoreParam = searchParams.get("score");
  const { value: scoreFromParams, locked: scoreLocked } = useMemo(() => {
    if (scoreParam === null) {
      return { value: null as number | null, locked: false };
    }

    const parsed = Number(scoreParam);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return {
        value: Math.floor(parsed),
        locked: true,
      };
    }

    return { value: null as number | null, locked: false };
  }, [scoreParam]);

  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [score, setScore] = useState<number>(scoreFromParams ?? 0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (scoreFromParams !== null) {
      setScore(scoreFromParams);
    }
  }, [scoreFromParams]);

  const fetchEntries = async () => {
    setRefreshing(true);
    try {
      const response = await fetch("/api/leaderboard");
      if (!response.ok) {
        throw new Error("Failed to load leaderboard");
      }
      const data = await response.json();
      setEntries(data.entries ?? []);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Unable to load leaderboard entries");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const normalizedUsername = normalizeLeaderboardUsername(username);

    if (!normalizedUsername) {
      setError("Please enter a username");
      return;
    }

    if (!Number.isFinite(score) || score < 0) {
      setError("Score must be a non-negative number");
      return;
    }

    if (!publicKey || !signMessage) {
      setError("Connect a wallet that supports message signing");
      return;
    }

    try {
      setSubmitting(true);
      const nonceResponse = await fetch("/api/auth/nonce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: walletAddress }),
      });

      if (!nonceResponse.ok) {
        const errorData = await nonceResponse.json().catch(() => null);
        throw new Error(errorData?.error || "Failed to create nonce");
      }

      const { nonce } = await nonceResponse.json();
      const message = createLeaderboardMessage({
        username: normalizedUsername,
        score,
        nonce,
      });
      const encodedMessage = new TextEncoder().encode(message);
      const signatureBytes = await signMessage(encodedMessage);
      const signature = Buffer.from(signatureBytes).toString("base64");

      const submitResponse = await fetch("/api/leaderboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: normalizedUsername,
          score,
          wallet: walletAddress,
          nonce,
          signature,
        }),
      });

      if (!submitResponse.ok) {
        const errorData = await submitResponse.json().catch(() => null);
        throw new Error(errorData?.error || "Failed to submit score");
      }

      const result = await submitResponse.json();
      setSuccess(
        result.improved
          ? "New high score recorded!"
          : "Score submitted successfully."
      );
      setUsername(normalizedUsername);
      await fetchEntries();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to submit score");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Community Leaderboard
        </h1>
        <p className="text-gray-600 mt-2">
          Connect your Solana wallet, sign your score, and climb the ranks.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="bg-white shadow-lg rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="text-xl font-semibold text-gray-900">Top Players</h2>
            <button
              type="button"
              onClick={fetchEntries}
              disabled={refreshing}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 disabled:text-gray-400"
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Player
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Wallet
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                      Loading leaderboard...
                    </td>
                  </tr>
                ) : entries.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                      No entries yet. Be the first to submit your score!
                    </td>
                  </tr>
                ) : (
                  entries.map((entry) => {
                    const isUser =
                      walletAddress && entry.wallet === walletAddress;
                    return (
                      <tr
                        key={entry.id}
                        className={isUser ? "bg-blue-50/60" : undefined}
                      >
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                          #{entry.rank}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">
                            {entry.username}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(entry.updatedAt).toLocaleString()}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-right text-blue-600">
                          {entry.score.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 font-mono">
                          {shortenAddress(entry.wallet)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white shadow-lg rounded-2xl border border-gray-100 p-6 space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">
              Submit Your Score
            </h2>
            <p className="text-sm text-gray-600">
              Use your wallet to cryptographically sign your score so we can
              reward you securely.
            </p>
          </div>

          <WalletMultiButton className="!w-full !justify-center" />

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Your display name"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={50}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Score
              </label>
              <input
                type="number"
                value={Number.isFinite(score) ? score : ""}
                onChange={(event) =>
                  setScore(Math.max(0, Math.floor(Number(event.target.value))))
                }
                placeholder="0"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                min={0}
                step={1}
                readOnly={scoreLocked}
              />
              {scoreLocked && (
                <p className="mt-1 text-xs text-gray-500">
                  Score provided by the game session. Re-run the challenge to
                  improve it.
                </p>
              )}
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 text-sm text-red-700 border border-red-200">
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 rounded-lg bg-green-50 text-sm text-green-700 border border-green-200">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {submitting ? "Submitting..." : "Sign & Submit Score"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <ConnectionProvider endpoint="https://api.mainnet-beta.solana.com">
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <LeaderboardContent />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
