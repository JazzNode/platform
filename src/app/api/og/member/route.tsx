import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { getSpaceGrotesk, fontConfig, fetchImageAsDataUrl } from '../_fonts';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const name = searchParams.get('name') || 'Member';
  const username = searchParams.get('username') || '';
  const avatarParam = searchParams.get('avatar') || '';
  const role = searchParams.get('role') || '';

  const [fontData, avatarSrc] = await Promise.all([
    getSpaceGrotesk(),
    avatarParam ? fetchImageAsDataUrl(avatarParam) : Promise.resolve(null),
  ]);

  const roleLabel: Record<string, string> = {
    member: 'Member',
    artist_manager: 'Artist',
    venue_manager: 'Venue Manager',
    admin: 'Admin',
  };

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
          background: 'linear-gradient(135deg, #0a0a0f 0%, #141428 40%, #1a1020 70%, #0a0a0f 100%)',
        }}
      >
        {/* Decorative circles */}
        <div
          style={{
            position: 'absolute',
            top: -150,
            right: -150,
            width: 500,
            height: 500,
            borderRadius: '50%',
            border: '1px solid rgba(196,163,90,0.1)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -100,
            left: -100,
            width: 350,
            height: 350,
            borderRadius: '50%',
            border: '1px solid rgba(196,163,90,0.07)',
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
            padding: '60px 80px',
            position: 'relative',
          }}
        >
          {/* Avatar */}
          <div
            style={{
              display: 'flex',
              flexShrink: 0,
              width: 200,
              height: 200,
              borderRadius: '50%',
              overflow: 'hidden',
              border: '3px solid rgba(196,163,90,0.5)',
              boxShadow: '0 0 60px rgba(196,163,90,0.15)',
              marginBottom: 32,
              alignItems: 'center',
              justifyContent: 'center',
              background: avatarSrc
                ? 'transparent'
                : 'linear-gradient(135deg, #1a1a2e 0%, #2a1a3e 100%)',
            }}
          >
            {avatarSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarSrc}
                alt=""
                width={200}
                height={200}
                style={{ objectFit: 'cover', width: 200, height: 200 }}
              />
            ) : (
              <svg
                width="80"
                height="80"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(196,163,90,0.45)"
                strokeWidth="1.5"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            )}
          </div>

          {/* Name */}
          <div
            style={{
              fontSize: name.length > 20 ? 44 : 52,
              fontWeight: 700,
              color: '#ffffff',
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
              marginBottom: 8,
              display: 'flex',
              textAlign: 'center',
            }}
          >
            {name}
          </div>

          {/* Username */}
          {username && (
            <div
              style={{
                fontSize: 24,
                color: 'rgba(255,255,255,0.45)',
                fontWeight: 400,
                marginBottom: 16,
                display: 'flex',
              }}
            >
              @{username}
            </div>
          )}

          {/* Role badge */}
          {role && roleLabel[role] && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: 32,
              }}
            >
              <div
                style={{
                  fontSize: 16,
                  color: '#C4A35A',
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  padding: '6px 20px',
                  border: '1px solid rgba(196,163,90,0.3)',
                  borderRadius: 20,
                  display: 'flex',
                }}
              >
                {roleLabel[role]}
              </div>
            </div>
          )}

          {/* Brand */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
              marginTop: 'auto',
            }}
          >
            <div
              style={{
                width: 60,
                height: 2,
                background: 'linear-gradient(90deg, transparent, #C4A35A, transparent)',
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
    ),
    {
      width: 1200,
      height: 630,
      fonts: fontConfig(fontData),
    },
  );
}
