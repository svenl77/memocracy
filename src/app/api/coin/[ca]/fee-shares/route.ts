import { NextRequest, NextResponse } from "next/server";
import { getBagsFeeShareInfo } from "@/lib/bagsFeeShare";
import { logger } from "@/lib/logger";

export async function GET(
  request: NextRequest,
  { params }: { params: { ca: string } }
) {
  try {
    const tokenMint = params.ca;

    if (!tokenMint) {
      return NextResponse.json(
        { error: "Token mint address is required" },
        { status: 400 }
      );
    }

    const feeShareInfo = await getBagsFeeShareInfo(tokenMint);

    if (!feeShareInfo) {
      return NextResponse.json(
        { error: "Token is not a Bags token or fee share info unavailable" },
        { status: 404 }
      );
    }

    return NextResponse.json(feeShareInfo);
  } catch (error) {
    logger.error("Failed to fetch fee share info", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        error: "Failed to fetch fee share information",
        details:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.message
              : String(error)
            : undefined,
      },
      { status: 500 }
    );
  }
}
