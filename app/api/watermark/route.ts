import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const imageUrl = searchParams.get('url');
  const authorName = searchParams.get('author') || 'LepiNet Contributor';

  if (!imageUrl) {
    return new NextResponse('Missing Image URL', { status: 400 });
  }

  try {
    // 1. Fetch the original image from Supabase
    const response = await fetch(imageUrl);
    const arrayBuffer = await response.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    // 2. Create the Watermark (SVG)
    // This draws semi-transparent text
    const svgWatermark = `
      <svg width="500" height="100">
        <style>
          .title { fill: rgba(255, 255, 255, 0.5); font-size: 30px; font-weight: bold; font-family: sans-serif; }
          .subtitle { fill: rgba(255, 255, 255, 0.3); font-size: 14px; font-family: sans-serif; }
        </style>
        <text x="20" y="50" class="title">LepiNet</text>
        <text x="20" y="80" class="subtitle">© ${authorName}</text>
      </svg>
    `;

    // 3. Process with Sharp
    const watermarkedImage = await sharp(inputBuffer)
      .composite([{
        input: Buffer.from(svgWatermark),
        gravity: 'southeast', // Position bottom-right
        blend: 'over'
      }])
      .jpeg({ quality: 90 }) // Convert to high-quality JPEG
      .toBuffer();

    // 4. Return the image
    return new NextResponse(watermarkedImage, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });

  } catch (error) {
    console.error('Watermark error:', error);
    return new NextResponse('Failed to process image', { status: 500 });
  }
}