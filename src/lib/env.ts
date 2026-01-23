import { z } from 'zod';

/**
 * Environment variable validation
 * This ensures all required environment variables are present and valid at startup
 * Prevents runtime errors from missing configuration
 */
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  
  // JWT Secret (must be at least 32 characters for security)
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters long"),
  
  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Optional: Solana RPC URL (defaults to public mainnet)
  SOLANA_RPC_URL: z.string().url().optional(),
  
  // Optional: Solana Vote Program ID (for on-chain voting)
  SOLANA_VOTE_PROGRAM_ID: z.string().optional(),
  
  // Optional: Cron secret for background jobs
  CRON_SECRET: z.string().optional(),
  
  // Optional: Allowed origin for CORS
  ALLOWED_ORIGIN: z.string().url().optional(),
  
  // Optional: Log level
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).optional(),
  
  // Bags API Integration
  BAGS_API_KEY: z.string().optional(),
  BAGS_API_BASE_URL: z.string().url().optional(),
  MEMOCRACY_PLATFORM_WALLET: z.string().optional(),
  MEMOCRACY_PLATFORM_FEE_PERCENTAGE: z.string().regex(/^0\.\d+$/).optional(),
  BAGS_FEE_SYNC_INTERVAL: z.string().optional(),
});

// Parse and validate environment variables
function validateEnv() {
  const isProduction = process.env.NODE_ENV === 'production';
  
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join('\n');
      
      // In development, warn but allow with defaults
      if (!isProduction) {
        console.warn(
          `⚠️  Environment variable validation warnings:\n${missingVars}\n\n` +
          `The app will continue, but please fix these before deploying to production.`
        );
        
        // Return with defaults for development
        return {
          DATABASE_URL: process.env.DATABASE_URL || 'file:./dev.db',
          JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-key-not-for-production-min-32-chars',
          NODE_ENV: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
          SOLANA_RPC_URL: process.env.SOLANA_RPC_URL,
          SOLANA_VOTE_PROGRAM_ID: process.env.SOLANA_VOTE_PROGRAM_ID,
          CRON_SECRET: process.env.CRON_SECRET,
          ALLOWED_ORIGIN: process.env.ALLOWED_ORIGIN,
          LOG_LEVEL: process.env.LOG_LEVEL as 'error' | 'warn' | 'info' | 'debug' | undefined,
          BAGS_API_KEY: process.env.BAGS_API_KEY,
          BAGS_API_BASE_URL: process.env.BAGS_API_BASE_URL,
          MEMOCRACY_PLATFORM_WALLET: process.env.MEMOCRACY_PLATFORM_WALLET,
          MEMOCRACY_PLATFORM_FEE_PERCENTAGE: process.env.MEMOCRACY_PLATFORM_FEE_PERCENTAGE,
          BAGS_FEE_SYNC_INTERVAL: process.env.BAGS_FEE_SYNC_INTERVAL,
        };
      }
      
      // In production, fail hard
      throw new Error(
        `❌ Invalid environment variables:\n${missingVars}\n\n` +
        `Please check your .env file or environment configuration.`
      );
    }
    throw error;
  }
}

// Export validated environment variables
export const env = validateEnv();

// Type-safe environment access
export type Env = z.infer<typeof envSchema>;
