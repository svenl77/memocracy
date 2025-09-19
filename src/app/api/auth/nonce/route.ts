import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const nonceSchema = z.object({
  wallet: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wallet } = nonceSchema.parse(body);

    // Generate a random nonce
    const nonce = Math.random().toString(36).substring(2, 15) + 
                  Math.random().toString(36).substring(2, 15);

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
