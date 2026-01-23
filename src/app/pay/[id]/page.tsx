"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Copy, Check, ExternalLink, Share2 } from "lucide-react";
import Header from "@/components/Header";
import { generatePaymentLink } from "@/lib/solanaPayLinks";
import QRCode from "qrcode";

interface FoundingWallet {
  id: string;
  address: string;
  label: string;
  description: string | null;
  fundingGoalUSD: number | null;
  currentBalanceUSD: number;
  status: string;
  coin: {
    id: string;
    mint: string;
    symbol: string;
    name: string;
  } | null;
  progressPercentage: number;
  isFullyFunded: boolean;
}

export default function PaymentLinkPage() {
  const params = useParams();
  const [wallet, setWallet] = useState<FoundingWallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [copiedItem, setCopiedItem] = useState<"address" | "link" | "memo" | null>(null);
  const [amount, setAmount] = useState<number | "">("");
  const [showManualInstructions, setShowManualInstructions] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchWalletData();
    }
  }, [params.id]);

  useEffect(() => {
    if (wallet) {
      generateQRCode();
    }
  }, [wallet, amount]);

  const fetchWalletData = async () => {
    try {
      const response = await fetch(`/api/founding-wallets/${params.id}`);
      if (!response.ok) {
        throw new Error("Founding wallet not found");
      }
      const data = await response.json();
      setWallet(data);
    } catch (error: any) {
      console.error("Failed to fetch wallet:", error);
      setError(error.message || "Failed to load wallet data");
    } finally {
      setLoading(false);
    }
  };

  const generateQRCode = async () => {
    if (!wallet) return;

    try {
      const paymentLink = generatePaymentLink(wallet.address, wallet.id, {
        amount: typeof amount === "number" ? amount : undefined,
        label: wallet.label,
        message: wallet.coin
          ? `Contribute to ${wallet.coin.name} - ${wallet.label}`
          : `Contribute to ${wallet.label}`,
      });

      const qrCode = await QRCode.toDataURL(paymentLink, {
        width: 300,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });

      setQrCodeDataUrl(qrCode);
    } catch (error) {
      console.error("Failed to generate QR code:", error);
    }
  };

  const getPaymentLink = (): string => {
    if (!wallet) return "";
    return generatePaymentLink(wallet.address, wallet.id, {
      amount: typeof amount === "number" ? amount : undefined,
      label: wallet.label,
      message: wallet.coin
        ? `Contribute to ${wallet.coin.name} - ${wallet.label}`
        : `Contribute to ${wallet.label}`,
    });
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getPaymentLink());
      setCopied(true);
      setCopiedItem("link");
      setTimeout(() => {
        setCopied(false);
        setCopiedItem(null);
      }, 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const handleCopyAddress = async () => {
    if (!wallet) return;
    try {
      await navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      setCopiedItem("address");
      setTimeout(() => {
        setCopied(false);
        setCopiedItem(null);
      }, 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const handleCopyMemo = async () => {
    if (!wallet) return;
    try {
      await navigator.clipboard.writeText(`MEMOCRACY:${wallet.id}`);
      setCopied(true);
      setCopiedItem("memo");
      setTimeout(() => {
        setCopied(false);
        setCopiedItem(null);
      }, 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const handleShare = async () => {
    if (!wallet) return;

    const shareData = {
      title: wallet.coin
        ? `Contribute to ${wallet.coin.name} - ${wallet.label}`
        : `Contribute to ${wallet.label}`,
      text: wallet.description || `Support ${wallet.label}`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (error) {
      console.error("Failed to share:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <Header />
        <div className="container mx-auto px-4 py-12">
          <div className="flex justify-center items-center h-64">
            <div className="text-lg">Loading payment link...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !wallet) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <Header />
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl p-8 text-center">
            <p className="text-red-500 text-lg mb-4">{error || "Wallet not found"}</p>
            <Link
              href="/"
              className="text-blue-600 hover:text-blue-800 inline-block"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const progressPercentage = wallet.progressPercentage || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Header />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Back Link */}
          <Link
            href={wallet.coin ? `/coin/${wallet.coin.mint}` : `/founding-wallet/${wallet.id}`}
            className="text-blue-600 hover:text-blue-800 mb-6 inline-flex items-center gap-2"
          >
            ← Back
          </Link>

          {/* Main Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 border border-gray-100">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
                {wallet.coin ? `${wallet.coin.name} - ${wallet.label}` : wallet.label}
              </h1>
              {wallet.description && (
                <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                  {wallet.description}
                </p>
              )}
            </div>

            {/* Funding Progress */}
            {wallet.fundingGoalUSD && (
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 mb-8 border border-blue-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Funding Progress</span>
                  <span className="text-sm font-bold text-gray-900">
                    {progressPercentage.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-4 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    ${wallet.currentBalanceUSD.toFixed(2)} raised
                  </span>
                  <span className="text-gray-600">
                    Goal: ${wallet.fundingGoalUSD.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* Amount Input (Optional) */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount (SOL) - Optional
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                placeholder="Enter amount or leave empty"
                value={amount}
                onChange={(e) =>
                  setAmount(e.target.value === "" ? "" : parseFloat(e.target.value))
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-2">
                Leave empty to let contributors choose their own amount
              </p>
            </div>

            {/* QR Code & Payment Info */}
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              {/* QR Code */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Scan to Pay
                </h3>
                {qrCodeDataUrl ? (
                  <div className="flex justify-center mb-4">
                    <img
                      src={qrCodeDataUrl}
                      alt="Payment QR Code"
                      className="w-64 h-64 border-4 border-gray-100 rounded-lg"
                    />
                  </div>
                ) : (
                  <div className="w-64 h-64 mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
                    <div className="text-gray-400">Generating QR Code...</div>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-4">
                  Scan with your Solana wallet app
                </p>
              </div>

              {/* Payment Details */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Payment Details
                  </h3>
                  <div className="space-y-3">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-xs text-gray-500 mb-1">Wallet Address</p>
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono text-gray-900 flex-1 break-all">
                          {wallet.address}
                        </code>
                        <button
                          onClick={handleCopyAddress}
                          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                          title="Copy address"
                        >
                          {copied && copiedItem === "address" ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-600" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-xs text-gray-500 mb-1">Solana Pay Link</p>
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono text-gray-900 flex-1 break-all text-xs">
                          {getPaymentLink()}
                        </code>
                        <button
                          onClick={handleCopyLink}
                          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                          title="Copy payment link"
                        >
                          {copied && copiedItem === "link" ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-600" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-3 pt-4">
                  <button
                    onClick={() => {
                      const paymentLink = getPaymentLink();
                      // Check if we're on a mobile device
                      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                      
                      if (isMobile) {
                        // On mobile, try to open the link directly
                        window.location.href = paymentLink;
                      } else {
                        // On desktop, show manual instructions
                        setShowManualInstructions(true);
                      }
                    }}
                    className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-5 h-5" />
                    Open in Wallet
                  </button>
                  <button
                    onClick={handleShare}
                    className="w-full px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <Share2 className="w-5 h-5" />
                    Share Payment Link
                  </button>
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <h4 className="font-semibold text-blue-900 mb-2">ℹ️ How to Contribute</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
                <li><strong>Mobile:</strong> Scan the QR code with your Solana wallet app (Phantom, Solflare, etc.)</li>
                <li><strong>Desktop:</strong> Copy the payment link and paste it into your wallet app, or manually send SOL to the address with the memo</li>
                <li>Review the payment details and confirm the transaction</li>
                <li>Your contribution will be automatically tracked and displayed</li>
              </ol>
              <div className="mt-4 p-3 bg-white rounded-lg border border-blue-200">
                <p className="text-xs font-semibold text-blue-900 mb-2">📋 Manual Payment Instructions:</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-blue-800 flex-1">
                      <strong>Wallet Address:</strong>
                    </p>
                    <code className="text-xs bg-blue-100 px-2 py-1 rounded font-mono">{wallet.address}</code>
                    <button
                      onClick={handleCopyAddress}
                      className="p-1 hover:bg-blue-200 rounded transition-colors"
                      title="Copy address"
                    >
                      {copied && copiedItem === "address" ? (
                        <Check className="w-3 h-3 text-green-600" />
                      ) : (
                        <Copy className="w-3 h-3 text-blue-600" />
                      )}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-blue-800 flex-1">
                      <strong>Memo (IMPORTANT):</strong>
                    </p>
                    <code className="text-xs bg-blue-100 px-2 py-1 rounded font-mono">MEMOCRACY:{wallet.id}</code>
                    <button
                      onClick={handleCopyMemo}
                      className="p-1 hover:bg-blue-200 rounded transition-colors"
                      title="Copy memo"
                    >
                      {copied && copiedItem === "memo" ? (
                        <Check className="w-3 h-3 text-green-600" />
                      ) : (
                        <Copy className="w-3 h-3 text-blue-600" />
                      )}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-blue-700 mt-2">
                  ⚠️ Make sure to include the memo when sending, otherwise your payment might not be automatically attributed to this project!
                </p>
              </div>
              <p className="text-xs text-blue-700 mt-4">
                <strong>Note:</strong> The payment link includes a memo that automatically identifies this project, ensuring your contribution is correctly attributed.
              </p>
            </div>

            {/* Manual Instructions Modal */}
            {showManualInstructions && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Desktop Payment Instructions</h3>
                  <p className="text-gray-600 mb-4">
                    On desktop, the "Open in Wallet" button may not work directly. Please use one of these methods:
                  </p>
                  <div className="space-y-3 mb-6">
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <p className="font-semibold text-green-900 mb-3">✅ Recommended Method: Manual Transfer</p>
                      <div className="space-y-3 text-sm">
                        <div>
                          <p className="font-semibold text-green-900 mb-1">1. Open your Solana wallet (Phantom, Solflare, etc.)</p>
                        </div>
                        <div>
                          <p className="font-semibold text-green-900 mb-1">2. Click on "Send"</p>
                        </div>
                        <div>
                          <p className="font-semibold text-green-900 mb-1">3. Paste this address:</p>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="text-xs bg-white px-2 py-1 rounded flex-1 break-all font-mono border border-green-300">
                              {wallet.address}
                            </code>
                            <button
                              onClick={handleCopyAddress}
                              className="p-2 hover:bg-green-100 rounded transition-colors"
                              title="Copy address"
                            >
                              {copied && copiedItem === "address" ? (
                                <Check className="w-4 h-4 text-green-600" />
                              ) : (
                                <Copy className="w-4 h-4 text-green-600" />
                              )}
                            </button>
                          </div>
                        </div>
                        <div>
                          <p className="font-semibold text-green-900 mb-1">4. ⚠️ IMPORTANT: Add the memo:</p>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="text-xs bg-white px-2 py-1 rounded flex-1 font-mono border border-green-300">
                              MEMOCRACY:{wallet.id}
                            </code>
                            <button
                              onClick={handleCopyMemo}
                              className="p-2 hover:bg-green-100 rounded transition-colors"
                              title="Copy memo"
                            >
                              {copied && copiedItem === "memo" ? (
                                <Check className="w-4 h-4 text-green-600" />
                              ) : (
                                <Copy className="w-4 h-4 text-green-600" />
                              )}
                            </button>
                          </div>
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-2">
                            <p className="text-xs font-semibold text-yellow-900 mb-2">📱 Where do I find the memo field?</p>
                            <ul className="text-xs text-yellow-800 space-y-1 list-disc list-inside">
                              <li><strong>Phantom:</strong> After the amount → "Add Memo" or "Memo" button</li>
                              <li><strong>Solflare:</strong> Below the amount → "Memo" field</li>
                              <li><strong>Backpack:</strong> "Advanced" → "Memo" field</li>
                              <li><strong>Other Wallets:</strong> Look for "Memo", "Note", or "Message"</li>
                            </ul>
                            <p className="text-xs text-yellow-800 mt-2">
                              <strong>If no memo field is available:</strong> You can still send. The payment will be assigned via the wallet address (works if this wallet is only used for this project).
                            </p>
                          </div>
                          <p className="text-xs text-blue-600 mt-2">
                            💡 <strong>Tip:</strong> The memo field is sometimes hidden. Look for "Advanced Options", "More Options", or a "+" symbol.
                          </p>
                        </div>
                        <div>
                          <p className="font-semibold text-green-900 mb-1">5. Enter the amount and confirm the transaction</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <p className="font-semibold text-blue-900 mb-2">Alternative: Payment Link (only if supported)</p>
                      <p className="text-xs text-blue-700 mb-2">
                        Some wallets support Solana Pay links. If your wallet supports this:
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-white px-2 py-1 rounded flex-1 break-all font-mono border border-blue-300">
                          {getPaymentLink()}
                        </code>
                        <button
                          onClick={handleCopyLink}
                          className="p-2 hover:bg-blue-100 rounded transition-colors"
                          title="Copy payment link"
                        >
                          {copied && copiedItem === "link" ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4 text-blue-600" />
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-blue-700 mt-2">
                        <strong>Note:</strong> Do not paste into the address field! Look for "Import Payment Link" or similar in your wallet.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowManualInstructions(false)}
                    className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
                  >
                    Got it!
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
