/**
 * Bags API Client
 * Handles all interactions with the Bags.fm API
 * Documentation: https://docs.bags.fm/api-reference/introduction
 */

import { env } from "./env";
import { logger } from "./logger";

const BAGS_API_BASE_URL = env.BAGS_API_BASE_URL || "https://public-api-v2.bags.fm/api/v1";

interface BagsApiResponse<T> {
  success: boolean;
  response?: T;
  error?: string;
}

interface TokenMetadata {
  name: string;
  symbol: string;
  description?: string;
  image?: string; // URL (will be downloaded if imageFile not provided)
  imageFile?: Buffer; // Direct file buffer (preferred)
  website?: string;
  twitter?: string;
  telegram?: string;
  discord?: string;
}

interface TokenInfo {
  mint: string;
  name: string;
  symbol: string;
  decimals: number;
  uri?: string;
}

interface LaunchParams {
  tokenMint: string;
  initialLiquidity?: number;
  initialPrice?: number;
}

interface LaunchResult {
  transaction: string; // Base58 encoded transaction
  tokenMint: string;
}

interface FeeClaimer {
  wallet: string; // Base58 public key
  share: number; // 0.0 - 1.0
}

interface FeeShareParams {
  tokenMint: string;
  feeClaimers: FeeClaimer[];
}

interface FeeShareResult {
  transaction: string; // Base58 encoded transaction
}

interface LifetimeFees {
  tokenMint: string;
  lifetimeFees: number;
  totalVolume?: number;
  totalTrades?: number;
}

interface Creators {
  tokenMint: string;
  creators: Array<{
    wallet: string;
    share: number;
  }>;
}

interface ClaimStats {
  tokenMint: string;
  totalClaimable: number;
  claimed: number;
  pending: number;
}

export class BagsApiClient {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = env.BAGS_API_KEY || "";
    this.baseUrl = BAGS_API_BASE_URL;

    if (!this.apiKey) {
      logger.warn("BAGS_API_KEY not set. Bags API features will not work.");
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<BagsApiResponse<T>> {
    if (!this.apiKey) {
      throw new Error("BAGS_API_KEY is required for Bags API requests");
    }

    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      "x-api-key": this.apiKey,
      ...options.headers,
    };
    
    // Only set Content-Type for JSON, not for FormData (browser sets it automatically with boundary)
    if (!(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    try {
      // #region agent log
      const requestBody = options.body ? JSON.parse(options.body as string) : null;
      fetch('http://127.0.0.1:7243/ingest/31e8ab33-cdb9-4344-9d5a-61d877e5bc6c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'bagsApi.ts:113',message:'Bags API request',data:{endpoint,method:options.method,url,hasBody:!!options.body,bodyPreview:requestBody ? JSON.stringify(requestBody).substring(0,200) : null},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/31e8ab33-cdb9-4344-9d5a-61d877e5bc6c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'bagsApi.ts:120',message:'Bags API error response',data:{endpoint,status:response.status,statusText:response.statusText,errorText:errorText.substring(0,500)},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        logger.error("Bags API request failed", {
          endpoint,
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });

        return {
          success: false,
          error: `Bags API error: ${response.status} ${response.statusText}`,
        };
      }

      const data = await response.json();
      return data as BagsApiResponse<T>;
    } catch (error) {
      logger.error("Bags API request exception", {
        endpoint,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Create token info and metadata
   * POST /token-launch/create-token-info
   * Requires multipart/form-data with image file
   */
  async createTokenInfo(metadata: TokenMetadata): Promise<BagsApiResponse<TokenInfo>> {
    // Bags API requires image as file upload
    const formData = new FormData();
    
    formData.append("name", metadata.name);
    formData.append("symbol", metadata.symbol);
    if (metadata.description) {
      formData.append("description", metadata.description);
    }
    
    // Handle image: prefer imageFile (direct buffer), fallback to URL download
    if (metadata.imageFile) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/31e8ab33-cdb9-4344-9d5a-61d877e5bc6c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'bagsApi.ts:177',message:'Using provided image file',data:{fileSize:metadata.imageFile.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      
      // Convert Buffer to Blob for FormData
      const imageBlob = new Blob([metadata.imageFile], { type: "image/png" });
      formData.append("image", imageBlob, "token-image.png");
    } else if (metadata.image) {
      // Fallback: download from URL
      try {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/31e8ab33-cdb9-4344-9d5a-61d877e5bc6c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'bagsApi.ts:185',message:'Downloading image from URL',data:{imageUrl:metadata.image},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        
        const imageResponse = await fetch(metadata.image);
        if (!imageResponse.ok) {
          throw new Error(`Failed to download image: ${imageResponse.statusText}`);
        }
        
        const imageBlob = await imageResponse.blob();
        formData.append("image", imageBlob, "token-image.png");
        
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/31e8ab33-cdb9-4344-9d5a-61d877e5bc6c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'bagsApi.ts:195',message:'Image downloaded and added to form',data:{fileSize:imageBlob.size,fileType:imageBlob.type},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
      } catch (error) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/31e8ab33-cdb9-4344-9d5a-61d877e5bc6c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'bagsApi.ts:200',message:'Image download error',data:{error:error instanceof Error ? error.message : String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        throw new Error(`Failed to process image: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      // Image is required by Bags API
      throw new Error("Image is required for token creation. Please upload an image file.");
    }
    
    // Use multipart/form-data instead of JSON
    return this.request<TokenInfo>("/token-launch/create-token-info", {
      method: "POST",
      body: formData,
      // Don't set Content-Type header - browser will set it with boundary for FormData
    });
  }

  /**
   * Create token launch transaction
   * POST /token-launch/create-token-launch-transaction
   */
  async createTokenLaunch(
    params: LaunchParams
  ): Promise<BagsApiResponse<LaunchResult>> {
    return this.request<LaunchResult>("/token-launch/create-token-launch-transaction", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  /**
   * Create fee share config transaction
   * POST /fee-share/create-fee-share-config-transaction
   */
  async createFeeShareConfig(
    params: FeeShareParams
  ): Promise<BagsApiResponse<FeeShareResult>> {
    return this.request<FeeShareResult>("/fee-share/create-fee-share-config-transaction", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  /**
   * Get fee share wallet info
   * GET /fee-share/get-fee-share-wallet-v2
   */
  async getFeeShareWallet(tokenMint: string): Promise<BagsApiResponse<any>> {
    return this.request(`/fee-share/get-fee-share-wallet-v2?tokenMint=${tokenMint}`, {
      method: "GET",
    });
  }

  /**
   * Get token lifetime fees
   * GET /analytics/get-token-lifetime-fees
   */
  async getTokenLifetimeFees(tokenMint: string): Promise<BagsApiResponse<LifetimeFees>> {
    return this.request<LifetimeFees>(
      `/analytics/get-token-lifetime-fees?tokenMint=${tokenMint}`,
      {
        method: "GET",
      }
    );
  }

  /**
   * Get token creators
   * GET /analytics/get-token-launch-creators
   */
  async getTokenCreators(tokenMint: string): Promise<BagsApiResponse<Creators>> {
    return this.request<Creators>(
      `/analytics/get-token-launch-creators?tokenMint=${tokenMint}`,
      {
        method: "GET",
      }
    );
  }

  /**
   * Get token claim stats
   * GET /analytics/get-token-claim-stats
   */
  async getTokenClaimStats(tokenMint: string): Promise<BagsApiResponse<ClaimStats>> {
    return this.request<ClaimStats>(
      `/analytics/get-token-claim-stats?tokenMint=${tokenMint}`,
      {
        method: "GET",
      }
    );
  }
}

// Singleton instance
export const bagsApi = new BagsApiClient();

// Export types
export type {
  TokenMetadata,
  TokenInfo,
  LaunchParams,
  LaunchResult,
  FeeClaimer,
  FeeShareParams,
  FeeShareResult,
  LifetimeFees,
  Creators,
  ClaimStats,
};
