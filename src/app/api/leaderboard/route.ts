import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  createLeaderboardMessage,
  normalizeLeaderboardUsername,
} from "@/lib/signingMessages";
import { verifySolanaSignature } from "@/lib/verifySolanaSignature";
import { z } from "zod";

const submitSchema = z.object({
  username: z.string().min(1).max(50),
  score: z.coerce.number().int().min(0).max(1_000_000_000),
  wallet: z.string().min(1),
  nonce: z.string().min(1),
  signature: z.string().min(1),
});

export async function GET() {
  try {
    const entries = await prisma.leaderboardEntry.findMany({
      orderBy: [
        { score: "desc" },
        { updatedAt: "asc" },
      ],
      take: 100,
    });

    const payload = entries.map((entry, index) => ({
      id: entry.id,
      rank: index + 1,
      username: entry.username,
      wallet: entry.wallet,
      score: entry.score,
      updatedAt: entry.updatedAt,
    }));

    return NextResponse.json({ entries: payload });
  } catch (error) {
    console.error("Failed to load leaderboard:", error);
    return NextResponse.json(
      { error: "Failed to load leaderboard" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, score, wallet, nonce, signature } = submitSchema.parse(body);

    const normalizedUsername = normalizeLeaderboardUsername(username);
    if (!normalizedUsername) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      );
    }

    const nonceRecord = await prisma.nonce.findUnique({
      where: { value: nonce },
    });

    if (!nonceRecord || nonceRecord.wallet !== wallet || nonceRecord.consumedAt) {
      return NextResponse.json(
        { error: "Invalid or expired nonce" },
        { status: 400 }
      );
    }

    const message = createLeaderboardMessage({
      username: normalizedUsername,
      score,
      nonce,
    });

    const isValid = verifySolanaSignature({
      walletBase58: wallet,
      signatureBase58: signature,
      message,
    });

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    await prisma.nonce.update({
      where: { id: nonceRecord.id },
      data: { consumedAt: new Date() },
    });

    const existing = await prisma.leaderboardEntry.findUnique({
      where: { wallet },
    });

    const now = new Date();
    let improved = false;
    let entry;

    if (!existing) {
      improved = true;
      entry = await prisma.leaderboardEntry.create({
        data: {
          wallet,
          username: normalizedUsername,
          score,
          signature,
          nonce,
          message,
          signedAt: now,
        },
      });
    } else {
      const nextScore = Math.max(existing.score, score);
      improved = score > existing.score;

      if (
        improved ||
        existing.username !== normalizedUsername ||
        existing.score !== nextScore ||
        existing.signature !== signature
      ) {
        entry = await prisma.leaderboardEntry.update({
          where: { wallet },
          data: {
            username: normalizedUsername,
            score: nextScore,
            signature,
            nonce,
            message,
            signedAt: now,
          },
        });
      } else {
        entry = existing;
      }
    }

    return NextResponse.json({
      entry: {
        id: entry.id,
        username: entry.username,
        wallet: entry.wallet,
        score: entry.score,
        updatedAt: entry.updatedAt,
        signedAt: entry.signedAt,
      },
      improved,
    });
  } catch (error) {
    console.error("Failed to submit leaderboard score:", error);
    return NextResponse.json(
      { error: "Failed to submit score" },
      { status: 500 }
    );
  }
}
