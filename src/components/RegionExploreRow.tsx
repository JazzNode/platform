'use client';

import { useRegion } from './RegionProvider';
import FadeUp from '@/components/animations/FadeUp';

interface Props {
  regionCodes: string[];
  regionLabels: Record<string, string>;
  worldMapLabel: string;
}

const pillBase = 'px-3 py-1.5 rounded-full text-xs uppercase tracking-widest transition-all duration-300 border font-serif font-light cursor-pointer';
const pillActive = 'bg-gold/20 border-gold text-gold';
const pillInactive = 'bg-transparent border-[rgba(240,237,230,0.12)] text-[#8A8578] hover:border-[rgba(240,237,230,0.3)]';

export default function RegionExploreRow({ regionCodes, regionLabels, worldMapLabel }: Props) {
  const { region, setRegion } = useRegion();

  return (
    <FadeUp>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={() => setRegion(null)}
          className={`${pillBase} ${!region ? pillActive : pillInactive}`}
        >
          {worldMapLabel}
        </button>
        <span className="text-gold/20 text-xs select-none mx-0.5">│</span>
        {regionCodes.map((code) => (
          <button
            key={code}
            onClick={() => setRegion(region === code ? null : code)}
            className={`${pillBase} ${region === code ? pillActive : pillInactive}`}
          >
            {regionLabels[code] || code}
          </button>
        ))}
      </div>
    </FadeUp>
  );
}
