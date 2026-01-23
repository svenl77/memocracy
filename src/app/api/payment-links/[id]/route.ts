import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generatePaymentLink } from "@/lib/solanaPayLinks";
import { rateLimitMiddleware, rateLimitPresets } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";
import { safeErrorResponse } from "@/lib/apiHelpers";
import QRCode from "qrcode";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const rateLimitResponse = rateLimitMiddleware(request, rateLimitPresets.lenient);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const { searchParams } = new URL(request.url);
    const amount = searchParams.get("amount");

    const wallet = await prisma.projectWallet.findUnique({
      where: { id: params.id },
      include: {
        coin: {
          select: {
            id: true,
            mint: true,
            symbol: true,
            name: true,
          },
        },
      },
    });

    if (!wallet) {
      return NextResponse.json(
        { error: "Founding wallet not found" },
        { status: 404 }
      );
    }

    if (wallet.type !== "FOUNDING") {
      return NextResponse.json(
        { error: "Wallet is not a founding wallet" },
        { status: 400 }
      );
    }

    // Generate Solana Pay URL
    const solanaPayUrl = generatePaymentLink(wallet.address, wallet.id, {
      amount: amount ? parseFloat(amount) : undefined,
      label: wallet.label,
      message: wallet.coin
        ? `Contribute to ${wallet.coin.name} - ${wallet.label}`
        : `Contribute to ${wallet.label}`,
    });

    // Generate QR Code
    let qrCodeDataUrl = "";
    try {
      qrCodeDataUrl = await QRCode.toDataURL(solanaPayUrl, {
        width: 300,
        margin: 2,
      });
    } catch (error) {
      logger.warn("Failed to generate QR code", {
        walletId: params.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return NextResponse.json({
      wallet: {
        id: wallet.id,
        address: wallet.address,
        label: wallet.label,
        description: wallet.description,
        coin: wallet.coin,
      },
      paymentLink: {
        url: solanaPayUrl,
        qrCode: qrCodeDataUrl,
      },
      memo: `MEMOCRACY:${wallet.id}`,
    });
  } catch (error) {
    logger.error("Failed to generate payment link", {
      walletId: params.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return safeErrorResponse(error, "Failed to generate payment link");
  }
}
