import { logger } from "./logger";

export interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number; // milliseconds
  exponentialBackoff?: boolean;
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    exponentialBackoff = true,
    onRetry,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        const delay = exponentialBackoff
          ? retryDelay * Math.pow(2, attempt)
          : retryDelay;

        if (onRetry) {
          onRetry(attempt + 1, lastError);
        }

        logger.warn("Retrying after error", {
          attempt: attempt + 1,
          maxRetries,
          delay,
          error: lastError.message,
        });

        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        logger.error("Max retries reached", {
          maxRetries,
          error: lastError.message,
        });
      }
    }
  }

  throw lastError || new Error("Unknown error");
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: Error): boolean {
  const retryableMessages = [
    "timeout",
    "network",
    "connection",
    "ECONNREFUSED",
    "ETIMEDOUT",
    "ENOTFOUND",
    "rate limit",
    "too many requests",
    "503",
    "502",
    "504",
  ];

  const errorMessage = error.message.toLowerCase();
  return retryableMessages.some((msg) => errorMessage.includes(msg));
}

/**
 * Handle transaction errors gracefully
 */
export function handleTransactionError(error: unknown): {
  message: string;
  retryable: boolean;
  code?: string;
} {
  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase();

    // Network errors
    if (
      errorMessage.includes("network") ||
      errorMessage.includes("connection") ||
      errorMessage.includes("timeout")
    ) {
      return {
        message: "Network error. Please check your connection and try again.",
        retryable: true,
        code: "NETWORK_ERROR",
      };
    }

    // RPC errors
    if (
      errorMessage.includes("rpc") ||
      errorMessage.includes("rate limit") ||
      errorMessage.includes("too many requests")
    ) {
      return {
        message: "Service temporarily unavailable. Please try again in a moment.",
        retryable: true,
        code: "RPC_ERROR",
      };
    }

    // User rejection
    if (
      errorMessage.includes("reject") ||
      errorMessage.includes("user") ||
      errorMessage.includes("cancelled")
    ) {
      return {
        message: "Transaction was cancelled.",
        retryable: false,
        code: "USER_REJECTED",
      };
    }

    // Insufficient funds
    if (
      errorMessage.includes("insufficient") ||
      errorMessage.includes("balance") ||
      errorMessage.includes("lamports")
    ) {
      return {
        message: "Insufficient funds. Please add SOL to your wallet.",
        retryable: false,
        code: "INSUFFICIENT_FUNDS",
      };
    }

    // Program not deployed
    if (
      errorMessage.includes("program") ||
      errorMessage.includes("not deployed") ||
      errorMessage.includes("idl")
    ) {
      return {
        message: "Voting program not yet deployed. Using database fallback.",
        retryable: false,
        code: "PROGRAM_NOT_DEPLOYED",
      };
    }

    // Generic error
    return {
      message: error.message || "An unexpected error occurred.",
      retryable: isRetryableError(error),
      code: "UNKNOWN_ERROR",
    };
  }

  return {
    message: "An unexpected error occurred.",
    retryable: false,
    code: "UNKNOWN_ERROR",
  };
}

/**
 * Graceful degradation: Try on-chain, fallback to database
 */
export async function withGracefulDegradation<T>(
  onChainFn: () => Promise<T>,
  fallbackFn: () => Promise<T>,
  errorHandler?: (error: Error) => void
): Promise<T> {
  try {
    return await onChainFn();
  } catch (error) {
    const handledError = handleTransactionError(error);

    if (errorHandler) {
      errorHandler(error instanceof Error ? error : new Error(String(error)));
    }

    // If error is not retryable or program not deployed, use fallback
    if (!handledError.retryable || handledError.code === "PROGRAM_NOT_DEPLOYED") {
      logger.info("Falling back to database", {
        error: handledError.message,
        code: handledError.code,
      });
      return await fallbackFn();
    }

    // For retryable errors, throw to allow retry logic
    throw error;
  }
}

/**
 * Timeout wrapper for async functions
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number = 30000
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    }),
  ]);
}
