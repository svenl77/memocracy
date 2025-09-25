import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const TOKEN_IMAGE_DIR = path.join(process.cwd(), "public", "token-images");
const SOLANA_TOKEN_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

async function ensureImageDir() {
  await fs.mkdir(TOKEN_IMAGE_DIR, { recursive: true });
}

function buildImagePath(tokenAddress: string) {
  const normalizedAddress = tokenAddress.trim();
  const imagePath = path.join(TOKEN_IMAGE_DIR, `${normalizedAddress}.png`);
  const relativePath = path.relative(TOKEN_IMAGE_DIR, imagePath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error("Invalid token address path");
  }

  return imagePath;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { tokenAddress: string } }
) {
  try {
    const { tokenAddress } = params;

    if (!SOLANA_TOKEN_REGEX.test(tokenAddress)) {
      return NextResponse.json(
        { error: "Invalid token address" },
        { status: 400 }
      );
    }

    await ensureImageDir();

    const imagePath = buildImagePath(tokenAddress);

    try {
      const imageBuffer = await fs.readFile(imagePath);
      return new NextResponse(imageBuffer, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=86400",
        },
      });
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        console.error("Failed to read cached token image:", error);
        return new NextResponse("Error fetching image", { status: 500 });
      }
    }

    const dexscreenerUrl = `https://dd.dexscreener.com/ds-data/tokens/solana/${tokenAddress}.png?size=lg&key=18a3b6`;

    const response = await fetch(dexscreenerUrl);

    if (!response.ok) {
      return new NextResponse("Image not found", { status: 404 });
    }

    const imageBuffer = Buffer.from(await response.arrayBuffer());

    await fs.writeFile(imagePath, imageBuffer);

    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    console.error("Error fetching token image:", error);
    return new NextResponse("Error fetching image", { status: 500 });
  }
}
