import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import crypto from "crypto";

const nonceSchema = z.object({
  wallet: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wallet } = nonceSchema.parse(body);

    // Generate a cryptographically secure nonce
    const nonce = crypto.randomBytes(32).toString("base64url");

    // Remove previously issued nonces for the wallet to prevent reuse
    await prisma.nonce.deleteMany({
      where: { wallet },
    });

    // Store nonce in database
    await prisma.nonce.create({
      data: {
        wallet,
        value: nonce,
      },
    });

    return NextResponse.json({ nonce });
  } catch (error) {
    console.error("Nonce creation error:", error);
    return NextResponse.json(
      { error: "Failed to create nonce" },
      { status: 500 }
    );
  }
}
