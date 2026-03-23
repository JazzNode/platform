import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { getSpaceGrotesk, fontConfig, fetchImageAsDataUrl } from '../_fonts';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const title = searchParams.get('title') || 'Event';
  const venue = searchParams.get('venue') || '';
  const date = searchParams.get('date') || '';
  const posterParam = searchParams.get('poster') || '';

  const [fontData, poster] = await Promise.all([
    getSpaceGrotesk(),
    posterParam ? fetchImageAsDataUrl(posterParam) : Promise.resolve(null),
  ]);

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
        {/* Content layout */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            width: '100%',
            height: '100%',
            position: 'relative',
          }}
        >
          {/* Poster section (left) */}
          {poster && (
            <div
              style={{
                display: 'flex',
                width: 400,
                height: '100%',
                flexShrink: 0,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={poster}
                alt=""
                width={400}
                height={630}
                style={{ objectFit: 'cover', width: 400, height: 630 }}
              />
              {/* Gradient overlay from poster to content */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: 120,
                  height: '100%',
                  display: 'flex',
                  background: 'linear-gradient(90deg, transparent, #0a0a0f)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  width: '100%',
                  height: 80,
                  display: 'flex',
                  background: 'linear-gradient(transparent, rgba(10,10,15,0.8))',
                }}
              />
            </div>
          )}

          {/* Text section */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              flex: 1,
              padding: poster ? '60px 60px 60px 40px' : '60px 80px',
              minWidth: 0,
            }}
          >
            {/* Date badge */}
            {date && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    fontSize: 20,
                    color: '#C4A35A',
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    display: 'flex',
                  }}
                >
                  {date}
                </div>
              </div>
            )}

            {/* Title */}
            <div
              style={{
                fontSize: title.length > 40 ? 36 : title.length > 25 ? 44 : 52,
                fontWeight: 700,
                color: '#ffffff',
                lineHeight: 1.15,
                letterSpacing: '-0.02em',
                marginBottom: 24,
                display: 'flex',
                flexWrap: 'wrap',
              }}
            >
              {title}
            </div>

            {/* Venue */}
            {venue && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 32,
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#C4A35A"
                  strokeWidth="2"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <div
                  style={{
                    fontSize: 24,
                    color: 'rgba(255,255,255,0.7)',
                    fontWeight: 500,
                    display: 'flex',
                  }}
                >
                  {venue}
                </div>
              </div>
            )}

            {/* Divider + brand */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                marginTop: 'auto',
              }}
            >
              <div
                style={{
                  width: 60,
                  height: 2,
                  background: 'linear-gradient(90deg, #C4A35A, transparent)',
                  display: 'flex',
                }}
              />
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: '#C4A35A',
                    letterSpacing: '0.15em',
                    display: 'flex',
                  }}
                >
                  JAZZNODE
                </div>
                <div
                  style={{
                    fontSize: 16,
                    color: 'rgba(255,255,255,0.3)',
                    display: 'flex',
                  }}
                >
                  The Jazz Scene, Connected.
                </div>
              </div>
            </div>
          </div>

          {/* No-poster fallback: decorative elements */}
          {!poster && (
            <>
              <div
                style={{
                  position: 'absolute',
                  top: -100,
                  right: -100,
                  width: 350,
                  height: 350,
                  borderRadius: '50%',
                  border: '1px solid rgba(196,163,90,0.12)',
                  display: 'flex',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: -60,
                  right: 100,
                  width: 200,
                  height: 200,
                  borderRadius: '50%',
                  border: '1px solid rgba(196,163,90,0.08)',
                  display: 'flex',
                }}
              />
            </>
          )}
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
