"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function EmbedCodePage() {
  const params = useParams();
  const mint = params.ca as string;
  const [coin, setCoin] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [embedType, setEmbedType] = useState<"iframe" | "js">("iframe");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchCoin();
  }, [mint]);

  const fetchCoin = async () => {
    try {
      const response = await fetch(`/api/coins?page=1&limit=1000`);
      const data = await response.json();
      const coins = data.coins || data;
      const foundCoin = coins.find((c: any) => c.mint === mint);
      setCoin(foundCoin);
    } catch (error) {
      console.error("Failed to fetch coin:", error);
    } finally {
      setLoading(false);
    }
  };

  const widgetUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const embedUrl = `${widgetUrl}/embed/${mint}`;

  const iframeCode = `<iframe 
  src="${embedUrl}" 
  width="100%" 
  height="500" 
  frameborder="0" 
  style="border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);"
  allowtransparency="true">
</iframe>`;

  const jsCode = `<div id="memecoin-widget-${mint}"></div>
<script>
  (function() {
    var iframe = document.createElement('iframe');
    iframe.src = '${embedUrl}';
    iframe.width = '100%';
    iframe.height = '500';
    iframe.frameBorder = '0';
    iframe.style.borderRadius = '12px';
    iframe.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    iframe.allowTransparency = 'true';
    document.getElementById('memecoin-widget-${mint}').appendChild(iframe);
  })();
</script>`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto px-4 py-12">
          <div className="flex justify-center items-center h-64">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!coin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto px-4 py-12">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <p className="text-gray-600">Coin not found</p>
            <Link href="/" className="mt-4 inline-block text-blue-600 hover:underline">
              ← Back to Communities
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/coin/${mint}`}
            className="text-blue-600 hover:underline mb-4 inline-block"
          >
            ← Back to {coin.name}
          </Link>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Embed {coin.name} Community
          </h1>
          <p className="text-gray-600">
            Share your community widget on any website - WordPress, Wix, HTML, or any platform!
          </p>
        </div>

        {/* Embed Type Selector */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Choose Embed Method</h2>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => setEmbedType("iframe")}
              className={`p-4 rounded-xl border-2 transition-all ${
                embedType === "iframe"
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="text-2xl mb-2">📦</div>
              <h3 className="font-semibold text-gray-900">iframe (Recommended)</h3>
              <p className="text-sm text-gray-600 mt-1">
                Works everywhere - WordPress, Wix, HTML, etc.
              </p>
            </button>
            <button
              onClick={() => setEmbedType("js")}
              className={`p-4 rounded-xl border-2 transition-all ${
                embedType === "js"
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="text-2xl mb-2">⚡</div>
              <h3 className="font-semibold text-gray-900">JavaScript</h3>
              <p className="text-sm text-gray-600 mt-1">
                More flexible, requires script tag
              </p>
            </button>
          </div>

          {/* Code Display */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                Embed Code ({embedType === "iframe" ? "HTML" : "HTML + JavaScript"})
              </label>
              <button
                onClick={() => copyToClipboard(embedType === "iframe" ? iframeCode : jsCode)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-medium flex items-center gap-2"
              >
                {copied ? (
                  <>
                    <span>✓</span> Copied!
                  </>
                ) : (
                  <>
                    <span>📋</span> Copy Code
                  </>
                )}
              </button>
            </div>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
              <code>{embedType === "iframe" ? iframeCode : jsCode}</code>
            </pre>
          </div>

          {/* Preview */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Preview</h3>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 bg-gray-50">
              {embedType === "iframe" ? (
                <iframe
                  src={embedUrl}
                  width="100%"
                  height="500"
                  frameBorder="0"
                  style={{ borderRadius: '12px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}
                  allowTransparency={true}
                />
              ) : (
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                  <p className="text-gray-600 text-sm mb-4">
                    JavaScript widget preview (actual widget will appear when embedded)
                  </p>
                  <div id={`memecoin-widget-preview-${mint}`} className="min-h-[200px] flex items-center justify-center bg-gray-50 rounded-lg">
                    <iframe
                      src={embedUrl}
                      width="100%"
                      height="400"
                      frameBorder="0"
                      style={{ borderRadius: '12px' }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">How to Embed</h2>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Copy the Embed Code</h3>
                <p className="text-gray-600 text-sm">
                  Click the "Copy Code" button above to copy the embed code to your clipboard.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Paste into Your Website</h3>
                <p className="text-gray-600 text-sm">
                  <strong>WordPress:</strong> Add a "Custom HTML" block and paste the code.
                  <br />
                  <strong>Wix:</strong> Add an "HTML Code" element and paste the code.
                  <br />
                  <strong>HTML:</strong> Paste directly into your HTML where you want the widget.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Done!</h3>
                <p className="text-gray-600 text-sm">
                  The widget will automatically load and display your community. Users can view stats and click through to the full community page.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Customization Tips */}
        <div className="bg-blue-50 rounded-2xl p-6 mt-6 border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">💡 Customization Tips</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Adjust the <code className="bg-blue-100 px-1 rounded">width</code> and <code className="bg-blue-100 px-1 rounded">height</code> attributes to fit your layout</li>
            <li>The widget is fully responsive and will adapt to mobile devices</li>
            <li>Users can expand the widget to see the full community view</li>
            <li>The widget includes a "Powered by" link - please keep it for attribution</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
