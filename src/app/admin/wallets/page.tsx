"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Coin {
  id: string;
  mint: string;
  symbol: string;
  name: string;
}

interface ProjectWallet {
  id: string;
  address: string;
  label: string;
  coinId: string | null;
  coin: Coin | null;
  createdAt: string;
  pollCount: number;
  latestPoll: string | null;
}

export default function WalletsPage() {
  const [wallets, setWallets] = useState<ProjectWallet[]>([]);
  const [coins, setCoins] = useState<Coin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    address: "",
    label: "",
    coinId: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [walletsResponse, coinsResponse] = await Promise.all([
        fetch("/api/project-wallets"),
        fetch("/api/coins"),
      ]);

      if (walletsResponse.ok) {
        const walletsData = await walletsResponse.json();
        setWallets(walletsData);
      } else {
        console.error("Failed to fetch project wallets");
      }

      if (coinsResponse.ok) {
        const coinsData = await coinsResponse.json();
        setCoins(coinsData);
      } else {
        console.error("Failed to fetch coins");
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/project-wallets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          coinId: formData.coinId || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create project wallet");
      }

      const newWallet = await response.json();
      setWallets([newWallet, ...wallets]);
      setFormData({ address: "", label: "", coinId: "" });
      setShowCreateForm(false);
      setMessage("Project wallet created successfully!");
    } catch (error) {
      console.error("Failed to create project wallet:", error);
      setMessage(
        error instanceof Error ? error.message : "Failed to create project wallet"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manage Project Wallets</h1>
          <p className="text-gray-600 mt-2">
            Create and manage project wallets for contribution-gated polls
          </p>
        </div>
        <div className="flex space-x-4">
          <Link
            href="/admin"
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Back to Admin
          </Link>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {showCreateForm ? "Cancel" : "Create Wallet"}
          </button>
        </div>
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

      {showCreateForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Create New Project Wallet
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="address"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Wallet Address *
              </label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
                required
              />
            </div>

            <div>
              <label
                htmlFor="label"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Label *
              </label>
              <input
                type="text"
                id="label"
                name="label"
                value={formData.label}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Project Treasury"
                required
              />
            </div>

            <div>
              <label
                htmlFor="coinId"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Parent Coin (Optional)
              </label>
              <select
                id="coinId"
                name="coinId"
                value={formData.coinId}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No parent coin</option>
                {coins.map((coin) => (
                  <option key={coin.id} value={coin.id}>
                    {coin.name} ({coin.symbol})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                If selected, polls using this wallet will also require holding the parent coin
              </p>
            </div>

            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? "Creating..." : "Create Wallet"}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Existing Project Wallets ({wallets.length})
          </h2>
        </div>

        {wallets.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No project wallets found. Create your first wallet to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Wallet
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Parent Coin
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Polls
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {wallets.map((wallet) => (
                  <tr key={wallet.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {wallet.label}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-mono">
                        {wallet.address.slice(0, 8)}...{wallet.address.slice(-8)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {wallet.coin ? (
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {wallet.coin.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {wallet.coin.symbol}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">None</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {wallet.pollCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(wallet.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}




