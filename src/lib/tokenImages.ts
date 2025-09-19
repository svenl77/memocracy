// Utility functions for token images and logos

export function getTokenImageUrl(tokenAddress: string, symbol?: string): string {
  // Try multiple sources for token images
  const sources = [
    // Solana Token List (official)
    `https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/${tokenAddress}/logo.png`,
    // Jupiter Token List
    `https://cdn.jsdelivr.net/gh/solana-labs/token-list@main/assets/mainnet/${tokenAddress}/logo.png`,
    // CoinGecko (if we have symbol)
    ...(symbol ? [`https://assets.coingecko.com/coins/images/solana/${symbol.toLowerCase()}.png`] : []),
    // Generic fallback
    `https://via.placeholder.com/64x64/6366f1/ffffff?text=${symbol?.charAt(0) || 'T'}`,
  ];

  return sources[0]; // Return the first source, we'll handle fallbacks in the component
}

export function getTokenImageUrls(tokenAddress: string, symbol?: string): string[] {
  return [
    // Solana Token List (official)
    `https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/${tokenAddress}/logo.png`,
    // Jupiter Token List
    `https://cdn.jsdelivr.net/gh/solana-labs/token-list@main/assets/mainnet/${tokenAddress}/logo.png`,
    // CoinGecko (if we have symbol)
    ...(symbol ? [`https://assets.coingecko.com/coins/images/solana/${symbol.toLowerCase()}.png`] : []),
    // Generic fallback
    `https://via.placeholder.com/64x64/6366f1/ffffff?text=${symbol?.charAt(0) || 'T'}`,
  ];
}

// Component for handling image fallbacks with multiple sources
export function TokenImage({ 
  tokenAddress, 
  symbol, 
  name, 
  className = "w-12 h-12 rounded-full",
  fallbackText,
  imageUrl
}: {
  tokenAddress: string;
  symbol?: string;
  name?: string;
  className?: string;
  fallbackText?: string;
  imageUrl?: string;
}) {
  const displayText = fallbackText || symbol?.charAt(0) || name?.charAt(0) || 'T';
  const imageUrls = imageUrl ? [imageUrl, ...getTokenImageUrls(tokenAddress, symbol)] : getTokenImageUrls(tokenAddress, symbol);

  return (
    <div className={`${className} bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg relative`}>
      {imageUrls.map((url, index) => (
        <img
          key={index}
          src={url}
          alt={`${name || symbol || 'Token'} logo`}
          className={`${className} object-cover absolute inset-0 ${index === 0 ? 'block' : 'hidden'}`}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const nextImg = target.parentElement?.querySelector(`img:nth-child(${index + 2})`) as HTMLImageElement;
            if (nextImg) {
              nextImg.style.display = 'block';
            }
          }}
        />
      ))}
      <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-lg">
        {displayText}
      </span>
    </div>
  );
}
