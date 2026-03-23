import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { getSpaceGrotesk, fontConfig } from '../_fonts';

export async function GET(req: NextRequest) {
  const fontData = await getSpaceGrotesk();
  const { searchParams } = req.nextUrl;
  const name = searchParams.get('name') || 'Venue';
  const city = searchParams.get('city') || '';
  const photo = searchParams.get('photo') || '';
  const type = searchParams.get('type') || '';

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
          background: 'linear-gradient(135deg, #0a0a0f 0%, #0f1a28 35%, #1a1020 65%, #0a0a0f 100%)',
        }}
      >
        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            width: '100%',
            height: '100%',
            position: 'relative',
          }}
        >
          {/* Photo section (left) */}
          {photo ? (
            <div
              style={{
                display: 'flex',
                width: 440,
                height: '100%',
                flexShrink: 0,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo}
                alt=""
                width={440}
                height={630}
                style={{ objectFit: 'cover', width: 440, height: 630 }}
              />
              {/* Right fade */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: 140,
                  height: '100%',
                  display: 'flex',
                  background: 'linear-gradient(90deg, transparent, #0a0a0f)',
                }}
              />
              {/* Bottom fade */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  width: '100%',
                  height: 100,
                  display: 'flex',
                  background: 'linear-gradient(transparent, rgba(10,10,15,0.8))',
                }}
              />
            </div>
          ) : (
            /* No-photo: decorative venue icon */
            <div
              style={{
                display: 'flex',
                width: 320,
                height: '100%',
                flexShrink: 0,
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              <div
                style={{
                  width: 180,
                  height: 180,
                  borderRadius: 24,
                  border: '2px solid rgba(196,163,90,0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, rgba(196,163,90,0.08), rgba(196,163,90,0.02))',
                }}
              >
                <svg
                  width="80"
                  height="80"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgba(196,163,90,0.5)"
                  strokeWidth="1.2"
                >
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </svg>
              </div>
            </div>
          )}

          {/* Text section */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              flex: 1,
              padding: photo ? '60px 60px 60px 20px' : '60px 60px 60px 0',
              minWidth: 0,
            }}
          >
            {/* Type badge */}
            {type && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    fontSize: 16,
                    color: '#C4A35A',
                    fontWeight: 600,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    padding: '6px 16px',
                    border: '1px solid rgba(196,163,90,0.3)',
                    borderRadius: 8,
                    display: 'flex',
                  }}
                >
                  {type}
                </div>
              </div>
            )}

            {/* Venue name */}
            <div
              style={{
                fontSize: name.length > 30 ? 38 : name.length > 20 ? 46 : 54,
                fontWeight: 700,
                color: '#ffffff',
                lineHeight: 1.15,
                letterSpacing: '-0.02em',
                marginBottom: 20,
                display: 'flex',
                flexWrap: 'wrap',
              }}
            >
              {name}
            </div>

            {/* City */}
            {city && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 32,
                }}
              >
                <svg
                  width="22"
                  height="22"
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
                    fontSize: 26,
                    color: 'rgba(255,255,255,0.7)',
                    fontWeight: 500,
                    display: 'flex',
                  }}
                >
                  {city}
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
