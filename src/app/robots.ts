import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://jazznode.com';

const LOCALES = ['en', 'zh', 'ja', 'ko', 'th', 'id'];

export default function robots(): MetadataRoute.Robots {
  // Generate locale-prefixed disallow rules for private routes
  const privateRoutes = ['/admin/', '/profile/', '/user/'];
  const disallow = [
    '/api/',
    '/_next/',
    ...privateRoutes,
    ...LOCALES.flatMap((loc) => privateRoutes.map((route) => `/${loc}${route}`)),
  ];

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
