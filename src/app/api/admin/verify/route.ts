import { NextRequest, NextResponse } from 'next/server';
import { checkAdminToken } from '@/lib/admin';

/**
 * Verify admin token
 * Used by frontend to check if admin token is valid
 */
export async function GET(request: NextRequest) {
  const isValid = checkAdminToken(request);
  
  if (isValid) {
    return NextResponse.json({ valid: true });
  }
  
  return NextResponse.json(
    { valid: false, error: 'Invalid admin token' },
    { status: 401 }
  );
}
