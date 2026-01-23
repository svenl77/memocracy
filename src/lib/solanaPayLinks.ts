/**
 * Solana Pay Links Generator
 * Generates Solana Pay URLs with memo support for project identification
 */

export interface PaymentLinkOptions {
  amount?: number; // Amount in SOL
  label?: string; // Payment label
  message?: string; // Payment message
  memo?: string; // Custom memo (will be prefixed with MEMOCRACY: if not already)
}

/**
 * Generate Solana Pay URL with memo for project identification
 * @param walletAddress - The recipient wallet address
 * @param foundingWalletId - The founding wallet ID for memo
 * @param options - Additional payment options
 * @returns Solana Pay URL
 */
export function generatePaymentLink(
  walletAddress: string,
  foundingWalletId: string,
  options: PaymentLinkOptions = {}
): string {
  const { amount, label, message, memo } = options;

  // Create memo with MEMOCRACY prefix
  const paymentMemo = memo || `MEMOCRACY:${foundingWalletId}`;

  // Build Solana Pay URL
  // Format: solana:{walletAddress}?amount={amount}&memo={memo}&label={label}&message={message}
  const params = new URLSearchParams();

  if (amount) {
    params.append("amount", amount.toString());
  }

  if (paymentMemo) {
    params.append("memo", paymentMemo);
  }

  if (label) {
    params.append("label", label);
  }

  if (message) {
    params.append("message", message);
  }

  const queryString = params.toString();
  return `solana:${walletAddress}${queryString ? `?${queryString}` : ""}`;
}

/**
 * Generate payment link with custom memo
 * @param walletAddress - The recipient wallet address
 * @param customMemo - Custom memo text
 * @param options - Additional payment options
 * @returns Solana Pay URL
 */
export function generatePaymentLinkWithMemo(
  walletAddress: string,
  customMemo: string,
  options: Omit<PaymentLinkOptions, "memo"> = {}
): string {
  return generatePaymentLink(walletAddress, "", {
    ...options,
    memo: customMemo,
  });
}

/**
 * Parse Solana Pay URL
 * @param url - Solana Pay URL
 * @returns Parsed payment information
 */
export function parseSolanaPayUrl(url: string): {
  walletAddress: string;
  amount?: number;
  memo?: string;
  label?: string;
  message?: string;
  projectId?: string; // Extracted from memo if MEMOCRACY: format
} {
  if (!url.startsWith("solana:")) {
    throw new Error("Invalid Solana Pay URL format");
  }

  const urlWithoutPrefix = url.substring(7); // Remove "solana:"
  const [address, queryString] = urlWithoutPrefix.split("?");

  const result: ReturnType<typeof parseSolanaPayUrl> = {
    walletAddress: address,
  };

  if (queryString) {
    const params = new URLSearchParams(queryString);

    if (params.has("amount")) {
      result.amount = parseFloat(params.get("amount") || "0");
    }

    if (params.has("memo")) {
      result.memo = params.get("memo") || undefined;
      
      // Extract project ID from MEMOCRACY: format
      if (result.memo?.startsWith("MEMOCRACY:")) {
        result.projectId = result.memo.substring(10); // Remove "MEMOCRACY:" prefix
      }
    }

    if (params.has("label")) {
      result.label = params.get("label") || undefined;
    }

    if (params.has("message")) {
      result.message = params.get("message") || undefined;
    }
  }

  return result;
}

/**
 * Validate memo format
 * @param memo - Memo string to validate
 * @returns True if valid MEMOCRACY format
 */
export function isValidMemocracyMemo(memo: string): boolean {
  return memo.startsWith("MEMOCRACY:") && memo.length > 10;
}

/**
 * Extract project ID from memo
 * @param memo - Memo string
 * @returns Project ID or null if invalid format
 */
export function extractProjectIdFromMemo(memo: string): string | null {
  if (!isValidMemocracyMemo(memo)) {
    return null;
  }
  return memo.substring(10); // Remove "MEMOCRACY:" prefix
}

/**
 * Create memo for founding wallet
 * @param foundingWalletId - The founding wallet ID
 * @returns Formatted memo string
 */
export function createMemocracyMemo(foundingWalletId: string): string {
  return `MEMOCRACY:${foundingWalletId}`;
}
