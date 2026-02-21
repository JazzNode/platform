import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'JazzNode',
  description: 'The Jazz Scene, Connected.',
};

// Root layout — just passes children through. Locale layout handles the real structure.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
