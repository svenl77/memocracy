import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { tokenAddress: string } }
) {
  try {
    const { tokenAddress } = params;
    
    // Check if image already exists locally
    const imagePath = path.join(process.cwd(), 'public', 'token-images', `${tokenAddress}.png`);
    
    if (fs.existsSync(imagePath)) {
      // Return the local image
      const imageBuffer = fs.readFileSync(imagePath);
      return new NextResponse(imageBuffer, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
        },
      });
    }
    
    // Download image from DexScreener
    const dexscreenerUrl = `https://dd.dexscreener.com/ds-data/tokens/solana/${tokenAddress}.png?size=lg&key=18a3b6`;
    
    const response = await fetch(dexscreenerUrl);
    
    if (!response.ok) {
      // If DexScreener doesn't have the image, return a 404
      return new NextResponse('Image not found', { status: 404 });
    }
    
    const imageBuffer = await response.arrayBuffer();
    
    // Save the image locally
    fs.writeFileSync(imagePath, Buffer.from(imageBuffer));
    
    // Return the image
    return new NextResponse(Buffer.from(imageBuffer), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      },
    });
    
  } catch (error) {
    console.error('Error fetching token image:', error);
    return new NextResponse('Error fetching image', { status: 500 });
  }
}
