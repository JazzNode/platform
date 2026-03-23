import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { getSpaceGrotesk, fontConfig } from '../_fonts';

export async function GET(req: NextRequest) {
  const fontData = await getSpaceGrotesk();
  const { searchParams } = req.nextUrl;
  const title = searchParams.get('title') || 'JazzNode';
  const subtitle = searchParams.get('subtitle') || 'The Jazz Scene, Connected.';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
          fontFamily: '"Space Grotesk", system-ui, sans-serif',
          background: 'linear-gradient(135deg, #0a0a0f 0%, #0f1428 30%, #1a0f20 60%, #0a0a0f 100%)',
        }}
      >
        {/* Decorative circles */}
        <div
          style={{
            position: 'absolute',
            top: -180,
            right: -100,
            width: 500,
            height: 500,
            borderRadius: '50%',
            border: '1px solid rgba(196,163,90,0.12)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -120,
            left: -60,
            width: 350,
            height: 350,
            borderRadius: '50%',
            border: '1px solid rgba(196,163,90,0.08)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 200,
            left: 150,
            width: 120,
            height: 120,
            borderRadius: '50%',
            border: '1px solid rgba(196,163,90,0.06)',
            display: 'flex',
          }}
        />

        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            padding: '60px 100px',
            position: 'relative',
          }}
        >
          {/* Logo text */}
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: '#C4A35A',
              letterSpacing: '0.25em',
              marginBottom: 40,
              display: 'flex',
            }}
          >
            JAZZNODE
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: title.length > 30 ? 48 : 64,
              fontWeight: 700,
              color: '#ffffff',
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
              textAlign: 'center',
              marginBottom: 24,
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            {title}
          </div>

          {/* Divider */}
          <div
            style={{
              width: 80,
              height: 2,
              background: 'linear-gradient(90deg, transparent, #C4A35A, transparent)',
              marginBottom: 24,
              display: 'flex',
            }}
          />

          {/* Subtitle */}
          <div
            style={{
              fontSize: 24,
              color: 'rgba(255,255,255,0.5)',
              fontWeight: 400,
              textAlign: 'center',
              display: 'flex',
            }}
          >
            {subtitle}
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: fontConfig(fontData),
    },
  );
}
