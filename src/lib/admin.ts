import { cookies } from 'next/headers';
import { env } from './env';

/**
 * Admin authentication utilities
 * Checks if a user is an admin based on ADMIN_TOKEN or admin wallet list
 */

// List of admin wallet addresses (can be set via environment variable)
const ADMIN_WALLETS = process.env.ADMIN_WALLETS
  ? process.env.ADMIN_WALLETS.split(',').map(w => w.trim())
  : [];

/**
 * Check if a wallet address is an admin
 */
export function isAdminWallet(wallet: string | null): boolean {
  if (!wallet) return false;
  return ADMIN_WALLETS.includes(wallet);
}

/**
 * Check if request has valid admin token
 */
export function checkAdminToken(request: Request): boolean {
  const authHeader = request.headers.get('authorization');
  const adminToken = process.env.ADMIN_TOKEN;
  
  if (!adminToken) {
    // In development, allow if no token is set (for testing)
    if (process.env.NODE_ENV === 'development') {
      return true;
    }
    return false;
  }
  
  return authHeader === `Bearer ${adminToken}`;
}

/**
 * Get admin status for a request
 * Checks both wallet-based and token-based admin access
 */
export function isAdmin(request: Request, wallet: string | null): boolean {
  // Check token-based admin
  if (checkAdminToken(request)) return true;
  
  // Check wallet-based admin
  if (wallet && isAdminWallet(wallet)) return true;
  
  return false;
}
