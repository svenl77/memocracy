import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkAdminToken } from '@/lib/admin';
import { logger } from '@/lib/logger';

/**
 * Delete a coin (admin only)
 * DELETE /api/admin/coins/[id]
 */
export async function DELETE(
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
    const coin = await prisma.coin.findUnique({
      where: { id: params.id },
      include: {
        polls: true,
        votes: true,
      },
    });

    if (!coin) {
      return NextResponse.json(
        { error: 'Coin not found' },
        { status: 404 }
      );
    }

    // Check if coin has polls or votes
    if (coin.polls.length > 0 || coin.votes.length > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete coin with existing polls or votes',
          pollCount: coin.polls.length,
          voteCount: coin.votes.length,
        },
        { status: 400 }
      );
    }

    // Delete coin
    await prisma.coin.delete({
      where: { id: params.id },
    });

    logger.warn('Coin deleted by admin', {
      coinId: params.id,
      coinName: coin.name,
      coinMint: coin.mint,
    });

    return NextResponse.json({
      success: true,
      message: 'Coin deleted successfully',
    });
  } catch (error) {
    logger.error('Failed to delete coin', {
      coinId: params.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Failed to delete coin' },
      { status: 500 }
    );
  }
}
