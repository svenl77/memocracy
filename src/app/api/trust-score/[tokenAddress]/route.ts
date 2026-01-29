import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calculateTrustScore } from '@/lib/trustScore';

export async function GET(
  request: NextRequest,
  { params }: { params: { tokenAddress: string } }
) {
  try {
    const { tokenAddress } = params;

    // Check if we have a recent score (< 1 hour old)
    const coin = await prisma.coin.findUnique({
      where: { mint: tokenAddress },
      include: {
        trustScore: true,
      },
    });

    if (coin?.trustScore) {
      const lastChecked = new Date(coin.trustScore.lastChecked);
      const hoursSinceCheck = (Date.now() - lastChecked.getTime()) / (1000 * 60 * 60);

      // Return cached score if less than 1 hour old
      if (hoursSinceCheck < 1) {
        const detailedData = coin.trustScore.detailedData
          ? JSON.parse(coin.trustScore.detailedData)
          : null;

        return NextResponse.json({
          overallScore: coin.trustScore.overallScore,
          tier: coin.trustScore.tier,
          breakdown: {
            maturity: coin.trustScore.maturityScore,
            security: coin.trustScore.securityScore,
            liquidity: coin.trustScore.liquidityScore,
            trading: coin.trustScore.tradingScore,
            stability: coin.trustScore.stabilityScore,
          },
          flags: {
            mintDisabled: coin.trustScore.mintDisabled,
            freezeDisabled: coin.trustScore.freezeDisabled,
          },
          metrics: {
            contractAgeDays: coin.trustScore.contractAgeDays,
            liquidityUsd: coin.trustScore.liquidityUsd,
            sellPressure24h: coin.trustScore.sellPressure24h,
          },
          details: detailedData,
          lastChecked: coin.trustScore.lastChecked,
          cached: true,
        });
      }
    }

    // Calculate new score
    const scoreResult = await calculateTrustScore(tokenAddress);

    // Save to database if coin exists
    // Note: detailedData is excluded to avoid TEXT column size limits
    if (coin) {
      await prisma.trustScore.upsert({
        where: { coinId: coin.id },
        update: {
          overallScore: scoreResult.overallScore,
          tier: scoreResult.tier,
          maturityScore: scoreResult.breakdown.maturity,
          securityScore: scoreResult.breakdown.security,
          liquidityScore: scoreResult.breakdown.liquidity,
          tradingScore: scoreResult.breakdown.trading,
          stabilityScore: scoreResult.breakdown.stability,
          mintDisabled: scoreResult.flags.mintDisabled,
          freezeDisabled: scoreResult.flags.freezeDisabled,
          contractAgeDays: scoreResult.metrics.contractAgeDays,
          liquidityUsd: scoreResult.metrics.liquidityUsd,
          sellPressure24h: scoreResult.metrics.sellPressure24h,
          detailedData: null, // Don't store detailed data to avoid size limits
          lastChecked: new Date(),
          updatedAt: new Date(),
        },
        create: {
          coinId: coin.id,
          overallScore: scoreResult.overallScore,
          tier: scoreResult.tier,
          maturityScore: scoreResult.breakdown.maturity,
          securityScore: scoreResult.breakdown.security,
          liquidityScore: scoreResult.breakdown.liquidity,
          tradingScore: scoreResult.breakdown.trading,
          stabilityScore: scoreResult.breakdown.stability,
          mintDisabled: scoreResult.flags.mintDisabled,
          freezeDisabled: scoreResult.flags.freezeDisabled,
          contractAgeDays: scoreResult.metrics.contractAgeDays,
          liquidityUsd: scoreResult.metrics.liquidityUsd,
          sellPressure24h: scoreResult.metrics.sellPressure24h,
          detailedData: null, // Don't store detailed data to avoid size limits
        },
      });
    }

    return NextResponse.json({
      ...scoreResult,
      lastChecked: new Date(),
      cached: false,
    });
  } catch (error) {
    console.error('Trust score API error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate trust score', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Force recalculation
export async function POST(
  request: NextRequest,
  { params }: { params: { tokenAddress: string } }
) {
  try {
    const { tokenAddress } = params;

    const coin = await prisma.coin.findUnique({
      where: { mint: tokenAddress },
    });

    if (!coin) {
      return NextResponse.json({ error: 'Coin not found' }, { status: 404 });
    }

    // Force recalculation
    const scoreResult = await calculateTrustScore(tokenAddress);

    await prisma.trustScore.upsert({
      where: { coinId: coin.id },
      update: {
        overallScore: scoreResult.overallScore,
        tier: scoreResult.tier,
        maturityScore: scoreResult.breakdown.maturity,
        securityScore: scoreResult.breakdown.security,
        liquidityScore: scoreResult.breakdown.liquidity,
        tradingScore: scoreResult.breakdown.trading,
        stabilityScore: scoreResult.breakdown.stability,
        mintDisabled: scoreResult.flags.mintDisabled,
        freezeDisabled: scoreResult.flags.freezeDisabled,
        contractAgeDays: scoreResult.metrics.contractAgeDays,
        liquidityUsd: scoreResult.metrics.liquidityUsd,
        sellPressure24h: scoreResult.metrics.sellPressure24h,
        detailedData: null, // Don't store detailed data to avoid size limits
        lastChecked: new Date(),
        updatedAt: new Date(),
      },
      create: {
        coinId: coin.id,
        overallScore: scoreResult.overallScore,
        tier: scoreResult.tier,
        maturityScore: scoreResult.breakdown.maturity,
        securityScore: scoreResult.breakdown.security,
        liquidityScore: scoreResult.breakdown.liquidity,
        tradingScore: scoreResult.breakdown.trading,
        stabilityScore: scoreResult.breakdown.stability,
        mintDisabled: scoreResult.flags.mintDisabled,
        freezeDisabled: scoreResult.flags.freezeDisabled,
        contractAgeDays: scoreResult.metrics.contractAgeDays,
        liquidityUsd: scoreResult.metrics.liquidityUsd,
        sellPressure24h: scoreResult.metrics.sellPressure24h,
        detailedData: null, // Don't store detailed data to avoid size limits
      },
    });

    return NextResponse.json({
      ...scoreResult,
      lastChecked: new Date(),
      recalculated: true,
    });
  } catch (error) {
    console.error('Trust score recalculation error:', error);
    return NextResponse.json(
      { error: 'Failed to recalculate trust score' },
      { status: 500 }
    );
  }
}
