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

    // 2. Create the Watermark (SVG) - More visible version
    const svgWatermark = `
      <svg width="600" height="120">
        <defs>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
            <feOffset dx="2" dy="2" result="offsetblur"/>
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.8"/>
            </feComponentTransfer>
            <feMerge> 
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/> 
            </feMerge>
          </filter>
        </defs>
        <style>
          .bg-rect { fill: rgba(0, 0, 0, 0.7); }
          .title { fill: rgba(255, 255, 255, 0.95); font-size: 36px; font-weight: bold; font-family: Arial, sans-serif; filter: url(#shadow); }
          .subtitle { fill: rgba(255, 255, 255, 0.85); font-size: 18px; font-family: Arial, sans-serif; filter: url(#shadow); }
        </style>
        <rect x="0" y="0" width="600" height="120" class="bg-rect" rx="8"/>
        <text x="20" y="50" class="title">LepiNet</text>
        <text x="20" y="85" class="subtitle">© ${authorName}</text>
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
    return new NextResponse(watermarkedImage as unknown as BodyInit, {
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