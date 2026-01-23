"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
// Use global WalletProvider from layout.tsx instead of creating a new one
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
// Phantom is automatically detected via EIP-6963 Standard
// Only add wallets that don't implement the standard
import { SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { Connection, Transaction, VersionedTransaction } from "@solana/web3.js";
import Header from "@/components/Header";
import { Plus, X, Check, AlertCircle } from "lucide-react";

require("@solana/wallet-adapter-react-ui/styles.css");

// Wallets are registered in BagsCoinCreationPage component using useMemo
// Phantom is auto-detected via EIP-6963 Standard

const WalletMultiButton = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

interface FoundingWalletConfig {
  label: string;
  description: string;
  walletAddress: string;
  feeSharePercentage: number; // 0.0 - 1.0
  fundingGoalUSD?: number;
}

function BagsCoinCreationContent() {
  const { publicKey, connected, sendTransaction, wallet, connecting, disconnecting, disconnect } = useWallet();
  const { connection } = useConnection();
  const router = useRouter();
  
  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7243/ingest/31e8ab33-cdb9-4344-9d5a-61d877e5bc6c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'bags-coin/page.tsx:36',message:'useWallet state',data:{connected,connecting,disconnecting,hasPublicKey:!!publicKey,publicKeyStr:publicKey?.toString(),walletName:wallet?.adapter?.name,walletReady:wallet?.adapter?.readyState},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'C'})}).catch(()=>{});
  }, [connected, connecting, disconnecting, publicKey, wallet]);
  
  // #region agent log
  useEffect(() => {
    if (connecting) {
      const startTime = Date.now();
      const timeout = setTimeout(async () => {
        const elapsed = Date.now() - startTime;
        fetch('http://127.0.0.1:7243/ingest/31e8ab33-cdb9-4344-9d5a-61d877e5bc6c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'bags-coin/page.tsx:47',message:'Connection timeout - auto-disconnecting',data:{connecting,walletName:wallet?.adapter?.name,elapsed:elapsed+'ms'},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'D'})}).catch(()=>{});
        // Auto-disconnect if connection takes too long (15 seconds)
        if (connecting && !connected) {
          try {
            await disconnect();
            setError("Connection timeout. Please try again and make sure your wallet is unlocked.");
          } catch (err) {
            fetch('http://127.0.0.1:7243/ingest/31e8ab33-cdb9-4344-9d5a-61d877e5bc6c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'bags-coin/page.tsx:55',message:'Auto-disconnect error',data:{error:err instanceof Error ? err.message : String(err)},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'D'})}).catch(()=>{});
          }
        }
      }, 15000); // 15 second timeout
      return () => clearTimeout(timeout);
    }
  }, [connecting, wallet, connected, disconnect]);
  // #endregion
  
  // #region agent log
  const handleDisconnect = async () => {
    fetch('http://127.0.0.1:7243/ingest/31e8ab33-cdb9-4344-9d5a-61d877e5bc6c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'bags-coin/page.tsx:42',message:'Disconnect button clicked',data:{wasConnected:connected,wasConnecting:connecting},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    try {
      await disconnect();
      fetch('http://127.0.0.1:7243/ingest/31e8ab33-cdb9-4344-9d5a-61d877e5bc6c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'bags-coin/page.tsx:46',message:'Disconnect successful',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    } catch (error) {
      fetch('http://127.0.0.1:7243/ingest/31e8ab33-cdb9-4344-9d5a-61d877e5bc6c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'bags-coin/page.tsx:49',message:'Disconnect error',data:{error:error instanceof Error ? error.message : String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    }
  };
  // #endregion
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [preparedData, setPreparedData] = useState<{
    tokenMint: string;
    launchTransaction: string;
    feeShareTransaction: string;
  } | null>(null);

  // Step 1: Basic Info
  const [tokenName, setTokenName] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string>("");

  // Step 2: Founding Wallets
  const [foundingWallets, setFoundingWallets] = useState<FoundingWalletConfig[]>([
    {
      label: "",
      description: "",
      walletAddress: "",
      feeSharePercentage: 0,
    },
  ]);

  // Step 3: Review
  const [feeDistribution, setFeeDistribution] = useState<{
    valid: boolean;
    walletTotal: number;
    total: number;
    error?: string;
  }>({ valid: false, walletTotal: 0, total: 0 });

  const PLATFORM_FEE = 0.03; // 3%
  const MAX_WALLET_FEE = 1.0 - PLATFORM_FEE; // 97% (User can distribute)

  // Validate fee distribution
  // User should only distribute 97% (the remaining 3% is platform fee)
  useEffect(() => {
    const walletTotal = foundingWallets.reduce(
      (sum, w) => sum + w.feeSharePercentage,
      0
    );
    const total = walletTotal + PLATFORM_FEE;
    const expectedWalletTotal = MAX_WALLET_FEE; // 0.97 = 97%

    if (Math.abs(walletTotal - expectedWalletTotal) < 0.0001) {
      setFeeDistribution({ valid: true, walletTotal, total });
    } else {
      const remaining = expectedWalletTotal - walletTotal;
      if (remaining > 0) {
        setFeeDistribution({
          valid: false,
          walletTotal,
          total,
          error: `Distribute ${(remaining * 100).toFixed(2)}% more. Current: ${(walletTotal * 100).toFixed(2)}% (need 97% total)`,
        });
      } else {
        setFeeDistribution({
          valid: false,
          walletTotal,
          total,
          error: `Too much distributed. Current: ${(walletTotal * 100).toFixed(2)}% (max 97%, 3% is platform fee)`,
        });
      }
    }
  }, [foundingWallets]);

  const addWallet = () => {
    setFoundingWallets([
      ...foundingWallets,
      {
        label: "",
        description: "",
        walletAddress: "",
        feeSharePercentage: 0,
      },
    ]);
  };

  const removeWallet = (index: number) => {
    if (foundingWallets.length > 1) {
      setFoundingWallets(foundingWallets.filter((_, i) => i !== index));
    }
  };

  const updateWallet = (index: number, field: keyof FoundingWalletConfig, value: any) => {
    const updated = [...foundingWallets];
    updated[index] = { ...updated[index], [field]: value };
    setFoundingWallets(updated);
  };

  const handleImageUpload = (file: File) => {
    setImageError("");
    
    // Validate file type
    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setImageError("Invalid file type. Please use PNG, JPG, or WEBP.");
      return;
    }
    
    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setImageError("File size too large. Maximum size is 5MB.");
      return;
    }
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setImagePreview(result);
      
      // Validate image dimensions
      const img = new Image();
      img.onload = () => {
        const width = img.width;
        const height = img.height;
        const aspectRatio = width / height;
        
        // Check if image is roughly square (0.8 to 1.2 ratio)
        if (aspectRatio < 0.8 || aspectRatio > 1.2) {
          setImageError(`⚠️ Image should be square (1:1). Current: ${width}x${height} (${(aspectRatio * 100).toFixed(0)}%). The image will work but may not display optimally.`);
          // Still allow it, but warn the user
        }
        
        // Check minimum size (recommended: at least 200x200)
        if (width < 200 || height < 200) {
          setImageError(`⚠️ Image is small. Recommended minimum: 200x200px. Current: ${width}x${height}px.`);
        }
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
    
    setImageFile(file);
    // Store a placeholder - the actual file will be sent to the API
    setImage("uploaded-file");
  };

  const handlePrepare = async () => {
    if (!connected || !publicKey) {
      setError("Please connect your wallet first");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      // Validate all fields
      if (!tokenName || !tokenSymbol) {
        throw new Error("Token name and symbol are required");
      }

      if (!imageFile) {
        throw new Error("Token image is required. Please upload an image.");
      }

      if (foundingWallets.some((w) => !w.label || !w.walletAddress)) {
        throw new Error("All wallets must have a label and address");
      }

      if (!feeDistribution.valid) {
        throw new Error(feeDistribution.error || "Invalid fee distribution");
      }

      // Prepare FormData for file upload
      const formData = new FormData();
      formData.append("action", "prepare");
      formData.append("tokenName", tokenName);
      formData.append("tokenSymbol", tokenSymbol);
      if (description) {
        formData.append("description", description);
      }
      formData.append("image", imageFile);
      formData.append("foundingWallets", JSON.stringify(foundingWallets.map((w) => ({
        label: w.label,
        description: w.description || undefined,
        walletAddress: w.walletAddress,
        feeSharePercentage: w.feeSharePercentage,
        fundingGoalUSD: w.fundingGoalUSD || undefined,
      }))));
      formData.append("createdBy", publicKey.toString());

      // Prepare Bags Coin (get transactions to sign)
      const response = await fetch("/api/bags/coins", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to prepare Bags Coin");
      }

      const data = await response.json();
      setPreparedData({
        tokenMint: data.tokenMint,
        launchTransaction: data.transactions.launch,
        feeShareTransaction: data.transactions.feeShare,
      });
      setMessage("✅ Transactions prepared. Please sign them to continue.");
      setLoading(false);
    } catch (error) {
      console.error("Failed to prepare Bags Coin:", error);
      setError(error instanceof Error ? error.message : "Failed to prepare Bags Coin");
      setLoading(false);
    }
  };

  const handleSignAndFinalize = async () => {
    if (!connected || !publicKey || !sendTransaction || !preparedData) {
      setError("Please connect your wallet and prepare transactions first");
      return;
    }

    setSigning(true);
    setError("");
    setMessage("");

    try {
      // Deserialize and sign launch transaction
      let launchTx: Transaction | VersionedTransaction;
      try {
        launchTx = Transaction.from(Buffer.from(preparedData.launchTransaction, "base64"));
      } catch {
        // Try versioned transaction
        launchTx = VersionedTransaction.deserialize(
          Buffer.from(preparedData.launchTransaction, "base64")
        );
      }

      setMessage("Signing launch transaction...");
      const launchSignature = await sendTransaction(launchTx, connection, {
        skipPreflight: false,
      });

      // Wait for confirmation
      await connection.confirmTransaction(launchSignature, "confirmed");
      setMessage("✅ Launch transaction confirmed. Signing fee share transaction...");

      // Deserialize and sign fee share transaction
      let feeShareTx: Transaction | VersionedTransaction;
      try {
        feeShareTx = Transaction.from(Buffer.from(preparedData.feeShareTransaction, "base64"));
      } catch {
        feeShareTx = VersionedTransaction.deserialize(
          Buffer.from(preparedData.feeShareTransaction, "base64")
        );
      }

      const feeShareSignature = await sendTransaction(feeShareTx, connection, {
        skipPreflight: false,
      });

      // Wait for confirmation
      await connection.confirmTransaction(feeShareSignature, "confirmed");
      setMessage("✅ Both transactions confirmed. Finalizing...");

      // Finalize Bags Coin
      const response = await fetch("/api/bags/coins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "finalize",
          tokenName,
          tokenSymbol,
          description: description || undefined,
          image: image || undefined,
          foundingWallets: foundingWallets.map((w) => ({
            label: w.label,
            description: w.description || undefined,
            walletAddress: w.walletAddress,
            feeSharePercentage: w.feeSharePercentage,
            fundingGoalUSD: w.fundingGoalUSD || undefined,
          })),
          createdBy: publicKey.toString(),
          tokenMint: preparedData.tokenMint,
          launchTxSignature: launchSignature,
          feeShareTxSignature: feeShareSignature,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to finalize Bags Coin");
      }

      const data = await response.json();
      setMessage("✅ Bags Coin created successfully! Redirecting...");

      // Redirect to coin page
      setTimeout(() => {
        router.push(`/coin/${data.coin.tokenMint}`);
      }, 2000);
    } catch (error) {
      console.error("Failed to sign transactions:", error);
      setError(error instanceof Error ? error.message : "Failed to sign transactions");
      setSigning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              🚀 Create Bags-Powered Coin
            </h1>
            <p className="text-gray-600 mb-8">
              Launch a new token via Bags API with automatic fee distribution to multiple founding wallets.
            </p>

            {/* Progress Steps */}
            <div className="flex items-center justify-between mb-8">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                      step >= s
                        ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {step > s ? <Check className="w-5 h-5" /> : s}
                  </div>
                  {s < 3 && (
                    <div
                      className={`flex-1 h-1 mx-2 ${
                        step > s ? "bg-gradient-to-r from-blue-600 to-purple-600" : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Step 1: Basic Info */}
            {step === 1 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Step 1: Token Information</h2>
                
                {/* Wallet Connection Info */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
                  <h3 className="text-sm font-semibold text-blue-800 mb-3">🔐 Wallet Connection Required</h3>
                  <p className="text-sm text-blue-700 mb-4">
                    You need to connect your Solana wallet to sign the token launch transactions. 
                    <strong className="block mt-2">No fees required</strong> - you only need to sign transactions to create the token and fee share configuration.
                  </p>
                  <div className="flex flex-col items-center gap-3">
                    <WalletMultiButton className="!bg-gradient-to-r !from-blue-600 !to-purple-600 hover:!from-blue-700 hover:!to-purple-700 !rounded-xl !shadow-lg hover:!shadow-xl !transition-all !duration-200" />
                    {!connected && !connecting && (
                      <p className="text-xs text-gray-600 text-center max-w-md">
                        💡 Make sure you have a Solana wallet installed (Phantom, Solflare, or Backpack). 
                        Click the button above to connect.
                      </p>
                    )}
                    {connecting && (
                      <div className="flex flex-col items-center gap-2">
                        <p className="text-xs text-yellow-600 text-center max-w-md">
                          ⏳ Connecting to wallet... This may take a moment.
                        </p>
                        <button
                          onClick={handleDisconnect}
                          className="px-4 py-2 text-xs bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                        >
                          Cancel Connection
                        </button>
                      </div>
                    )}
                    {connected && (
                      <button
                        onClick={handleDisconnect}
                        className="px-4 py-2 text-xs bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                      >
                        Disconnect Wallet
                      </button>
                    )}
                  </div>
                  {connected && publicKey && (
                    <div className="mt-3 text-center">
                      <p className="text-xs text-blue-700">
                        ✅ Connected: {publicKey.toString().slice(0, 8)}...{publicKey.toString().slice(-8)}
                      </p>
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Token Name *
                  </label>
                  <input
                    type="text"
                    value={tokenName}
                    onChange={(e) => setTokenName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Memocracy Game Token"
                    maxLength={32}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Token Symbol *
                  </label>
                  <input
                    type="text"
                    value={tokenSymbol}
                    onChange={(e) => setTokenSymbol(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., MGT"
                    maxLength={10}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Describe your token and project..."
                    rows={4}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Token Image *
                  </label>
                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleImageUpload(file);
                          }
                        }}
                        className="hidden"
                        id="token-image-upload"
                      />
                      <label
                        htmlFor="token-image-upload"
                        className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors cursor-pointer flex items-center gap-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="17 8 12 3 7 8"></polyline>
                          <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        Choose Image
                      </label>
                      {imageFile && (
                        <button
                          type="button"
                          onClick={() => {
                            setImageFile(null);
                            setImagePreview(null);
                            setImage("");
                            setImageError("");
                          }}
                          className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    
                    {imageError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-800">{imageError}</p>
                      </div>
                    )}
                    
                    {imagePreview && (
                      <div className="relative">
                        <img
                          src={imagePreview}
                          alt="Token preview"
                          className="w-32 h-32 object-cover rounded-xl border-2 border-gray-200"
                        />
                        {imageFile && (
                          <div className="mt-2 text-xs text-gray-600">
                            <p>File: {imageFile.name}</p>
                            <p>Size: {(imageFile.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <p className="text-xs text-gray-500">
                      Recommended: Square image (1:1), max 5MB. Formats: PNG, JPG, WEBP
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setStep(2)}
                  disabled={!tokenName || !tokenSymbol || !imageFile || !connected}
                  className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {!connected ? "⚠️ Connect Wallet First" : !imageFile ? "⚠️ Upload Image First" : "Next: Founding Wallets"}
                </button>
              </div>
            )}

            {/* Step 2: Founding Wallets */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Step 2: Founding Wallets</h2>
                  <button
                    onClick={addWallet}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Wallet
                  </button>
                </div>

                <p className="text-sm text-gray-600">
                  Set up multiple founding wallets that will receive fees. Distribute <strong>97%</strong> among your wallets (3% platform fee is automatically added).
                </p>

                <div className="space-y-4">
                  {foundingWallets.map((wallet, index) => (
                    <div
                      key={index}
                      className="bg-gray-50 rounded-xl p-6 border border-gray-200"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-900">Wallet {index + 1}</h3>
                        {foundingWallets.length > 1 && (
                          <button
                            onClick={() => removeWallet(index)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Label *
                          </label>
                          <input
                            type="text"
                            value={wallet.label}
                            onChange={(e) => updateWallet(index, "label", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., Development"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Fee Share % * (of 97%)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="97"
                            value={wallet.feeSharePercentage * 100}
                            onChange={(e) => {
                              const percentage = parseFloat(e.target.value) / 100;
                              updateWallet(index, "feeSharePercentage", percentage);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., 60"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Max: 97% (3% is platform fee)
                          </p>
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Wallet Address *
                          </label>
                          <input
                            type="text"
                            value={wallet.walletAddress}
                            onChange={(e) => updateWallet(index, "walletAddress", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500"
                            placeholder="Solana wallet address (Base58)"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Description
                          </label>
                          <textarea
                            value={wallet.description}
                            onChange={(e) => updateWallet(index, "description", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="What will this wallet be used for?"
                            rows={2}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Funding Goal (USD, optional)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={wallet.fundingGoalUSD !== undefined ? wallet.fundingGoalUSD : ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              updateWallet(
                                index,
                                "fundingGoalUSD",
                                value === "" || isNaN(parseFloat(value)) ? undefined : parseFloat(value)
                              );
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., 10000"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Fee Distribution Summary */}
                <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                  <h3 className="font-semibold text-blue-900 mb-4">Fee Distribution Summary</h3>
                  <div className="space-y-2">
                    <div className="text-xs text-blue-700 mb-3">
                      You distribute: <strong>{(feeDistribution.walletTotal * 100).toFixed(2)}%</strong> / 97%
                    </div>
                    {foundingWallets.map((wallet, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-blue-800">
                          {wallet.label || `Wallet ${index + 1}`}:
                        </span>
                        <span className="font-semibold text-blue-900">
                          {(wallet.feeSharePercentage * 100).toFixed(2)}%
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm pt-2 border-t border-blue-200">
                      <span className="text-blue-800">Memocracy Platform (auto):</span>
                      <span className="font-semibold text-blue-900">3.00%</span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t-2 border-blue-300 font-bold">
                      <span className="text-blue-900">Total Distribution:</span>
                      <span
                        className={
                          feeDistribution.valid
                            ? "text-green-600"
                            : "text-red-600"
                        }
                      >
                        {(feeDistribution.total * 100).toFixed(2)}%
                      </span>
                    </div>
                    {!feeDistribution.valid && (
                      <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded-lg">
                        <p className="text-sm text-red-800 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          {feeDistribution.error}
                        </p>
                      </div>
                    )}
                    {feeDistribution.valid && (
                      <div className="mt-2 p-2 bg-green-100 border border-green-300 rounded-lg">
                        <p className="text-sm text-green-800 flex items-center gap-2">
                          <Check className="w-4 h-4" />
                          Perfect! 97% distributed + 3% platform = 100%
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    disabled={!feeDistribution.valid}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    Next: Review
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Review */}
            {step === 3 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Step 3: Review & Launch</h2>

                {/* Wallet Connection Status */}
                {!connected ? (
                  <div className="bg-yellow-50 rounded-xl p-6 border border-yellow-200">
                    <h3 className="text-sm font-semibold text-yellow-800 mb-3">⚠️ Wallet Not Connected</h3>
                    <p className="text-sm text-yellow-700 mb-4">
                      You need to connect your wallet to sign the transactions. <strong>No fees required</strong> - you only sign to create the token.
                    </p>
                    <div className="flex justify-center">
                      <WalletMultiButton className="!bg-gradient-to-r !from-blue-600 !to-purple-600 hover:!from-blue-700 hover:!to-purple-700 !rounded-xl !shadow-lg hover:!shadow-xl !transition-all !duration-200" />
                    </div>
                  </div>
                ) : (
                  <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                    <h3 className="text-sm font-semibold text-green-800 mb-3">✅ Wallet Connected</h3>
                    <p className="text-sm text-green-700 mb-2">
                      Connected: <strong>{publicKey?.toString().slice(0, 8)}...{publicKey?.toString().slice(-8)}</strong>
                    </p>
                    <p className="text-xs text-green-600">
                      This wallet will be used to sign the token launch transactions. No fees required.
                    </p>
                  </div>
                )}

                {/* Review Summary */}
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-4">Token Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Name:</span>
                      <span className="font-semibold">{tokenName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Symbol:</span>
                      <span className="font-semibold">{tokenSymbol}</span>
                    </div>
                    {description && (
                      <div>
                        <span className="text-gray-600">Description:</span>
                        <p className="text-gray-900 mt-1">{description}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-4">Founding Wallets</h3>
                  <div className="space-y-3">
                    {foundingWallets.map((wallet, index) => (
                      <div key={index} className="border-l-4 border-blue-500 pl-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-gray-900">{wallet.label}</p>
                            <p className="text-xs text-gray-600 font-mono mt-1">
                              {wallet.walletAddress.slice(0, 8)}...{wallet.walletAddress.slice(-8)}
                            </p>
                            {wallet.description && (
                              <p className="text-sm text-gray-700 mt-1">{wallet.description}</p>
                            )}
                          </div>
                          <span className="font-bold text-blue-600">
                            {(wallet.feeSharePercentage * 100).toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-red-800 text-sm">{error}</p>
                  </div>
                )}

                {message && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                    <p className="text-green-800 text-sm">{message}</p>
                  </div>
                )}

                <div className="flex gap-4">
                  <button
                    onClick={() => setStep(2)}
                    className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                  >
                    Back
                  </button>
                  {!preparedData ? (
                    <div className="space-y-3">
                      {!connected && (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm text-yellow-800">
                            ⚠️ Please connect your wallet first to continue
                          </p>
                        </div>
                      )}
                      <button
                        onClick={handlePrepare}
                        disabled={loading || !connected || !feeDistribution.valid}
                        className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Preparing Transactions...
                          </>
                        ) : !connected ? (
                          "⚠️ Connect Wallet First"
                        ) : (
                          "📝 Prepare Transactions (No Fees)"
                        )}
                      </button>
                      <p className="text-xs text-center text-gray-500">
                        Step 1: Prepare transactions (free) → Step 2: Sign in wallet (no fees) → Step 3: Coin created
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800 mb-2">
                          <strong>✅ Transactions Prepared!</strong>
                        </p>
                        <p className="text-xs text-blue-700">
                          You will need to sign 2 transactions in your wallet:
                        </p>
                        <ul className="text-xs text-blue-700 mt-2 space-y-1 list-disc list-inside">
                          <li>Token Launch Transaction</li>
                          <li>Fee Share Config Transaction</li>
                        </ul>
                        <p className="text-xs text-blue-600 mt-2">
                          <strong>No fees required</strong> - you only sign to authorize the creation.
                        </p>
                      </div>
                      <button
                        onClick={handleSignAndFinalize}
                        disabled={signing || !connected}
                        className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                      >
                        {signing ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Signing & Finalizing...
                          </>
                        ) : (
                          "🚀 Sign & Launch (No Fees)"
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Use global WalletProvider from layout.tsx - no need for nested providers
export default function BagsCoinCreationPage() {
  return <BagsCoinCreationContent />;
}
