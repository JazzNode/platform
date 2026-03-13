import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const name = searchParams.get('name') || 'Artist';
  const instrument = searchParams.get('instrument') || '';
  const photo = searchParams.get('photo') || '';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Background */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            background: 'linear-gradient(135deg, #0a0a0f 0%, #141428 40%, #1a1020 70%, #0a0a0f 100%)',
          }}
        />
        {/* Decorative circle top-right */}
        <div
          style={{
            position: 'absolute',
            top: -120,
            right: -120,
            width: 400,
            height: 400,
            borderRadius: '50%',
            border: '1px solid rgba(196,163,90,0.15)',
            display: 'flex',
          }}
        />
        {/* Decorative circle bottom-left */}
        <div
          style={{
            position: 'absolute',
            bottom: -80,
            left: -80,
            width: 300,
            height: 300,
            borderRadius: '50%',
            border: '1px solid rgba(196,163,90,0.1)',
            display: 'flex',
          }}
        />

        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            width: '100%',
            height: '100%',
            padding: '60px 80px',
            position: 'relative',
          }}
        >
          {/* Photo or placeholder */}
          <div
            style={{
              display: 'flex',
              flexShrink: 0,
              width: 280,
              height: 280,
              borderRadius: '50%',
              overflow: 'hidden',
              border: '3px solid rgba(196,163,90,0.6)',
              boxShadow: '0 0 60px rgba(196,163,90,0.2)',
              marginRight: 60,
              alignItems: 'center',
              justifyContent: 'center',
              background: photo
                ? 'transparent'
                : 'linear-gradient(135deg, #1a1a2e 0%, #2a1a3e 100%)',
            }}
          >
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photo}
                alt=""
                width={280}
                height={280}
                style={{ objectFit: 'cover', width: 280, height: 280 }}
              />
            ) : (
              <svg
                width="100"
                height="100"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(196,163,90,0.5)"
                strokeWidth="1.5"
              >
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
            )}
          </div>

          {/* Text content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              minWidth: 0,
            }}
          >
            {/* Artist name */}
            <div
              style={{
                fontSize: name.length > 20 ? 48 : 56,
                fontWeight: 700,
                color: '#ffffff',
                lineHeight: 1.15,
                letterSpacing: '-0.02em',
                marginBottom: 16,
                display: 'flex',
                flexWrap: 'wrap',
              }}
            >
              {name}
            </div>

            {/* Instrument */}
            {instrument && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 24,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 2,
                    background: 'rgba(196,163,90,0.6)',
                    display: 'flex',
                  }}
                />
                <div
                  style={{
                    fontSize: 26,
                    color: '#C4A35A',
                    fontWeight: 500,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    display: 'flex',
                  }}
                >
                  {instrument}
                </div>
              </div>
            )}

            {/* Divider */}
            <div
              style={{
                width: 60,
                height: 2,
                background: 'linear-gradient(90deg, #C4A35A, transparent)',
                marginBottom: 24,
                display: 'flex',
              }}
            />

            {/* Brand */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <div
                style={{
                  fontSize: 22,
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
                  fontSize: 18,
                  color: 'rgba(255,255,255,0.35)',
                  fontWeight: 400,
                  display: 'flex',
                }}
              >
                The Jazz Scene, Connected.
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
