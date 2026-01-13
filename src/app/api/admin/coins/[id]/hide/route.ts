import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkAdminToken } from '@/lib/admin';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const hideSchema = z.object({
  hidden: z.boolean(),
});

/**
 * Hide/unhide a coin (admin only)
 * POST /api/admin/coins/[id]/hide
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Check admin authentication
  if (!checkAdminToken(request)) {
    return NextResponse.json(
      { error: 'Unauthorized: Admin token required' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { hidden } = hideSchema.parse(body);

    // Update coin hidden status
    await prisma.coin.update({
      where: { id: params.id },
      data: { hidden },
    });

    logger.warn('Coin hidden status changed by admin', {
      coinId: params.id,
      hidden,
    });

    return NextResponse.json({
      success: true,
      message: `Coin ${hidden ? 'hidden' : 'unhidden'}`,
    });
  } catch (error) {
    logger.error('Failed to hide/unhide coin', {
      coinId: params.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Failed to update coin' },
      { status: 500 }
    );
  }
}
