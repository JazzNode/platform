'use client';

import { Fragment } from 'react';
import { useAdmin } from '@/components/AdminProvider';

/* ─── Types ─── */
interface Feature {
  name: string;
  tiers: (boolean | string)[];
}

interface FeatureGroup {
  category: string;
  items: Feature[];
}

interface CardData {
  tag: string;
  label: string;
  sub: string;
  color: string;
  tagColor: string;
}

export interface SectionData {
  columns: string[];
  colors: string[];
  features: FeatureGroup[];
  highlight: number;
  cards: CardData[];
}

/* ─── TierTable (pure) ─── */
function TierTable({
  columns,
  columnColors,
  features,
  highlight,
}: {
  columns: string[];
  columnColors: string[];
  features: FeatureGroup[];
  highlight: number;
}) {
  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <table className="w-full min-w-[600px] border-collapse">
        <thead>
          <tr>
            <th className="text-left py-4 px-4 text-sm text-[var(--muted)] font-normal w-[40%]" />
            {columns.map((col, i) => (
              <th
                key={col}
                className={`py-4 px-3 text-center text-sm font-semibold ${
                  i === highlight
                    ? 'text-gold bg-gold/5 rounded-t-xl'
                    : 'text-[var(--foreground)]'
                }`}
              >
                <span className={`inline-block px-3 py-1 rounded-full text-xs tracking-wider uppercase ${columnColors[i]}`}>
                  {col}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {features.map((group) => (
            <Fragment key={group.category}>
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="pt-6 pb-2 px-4 text-xs uppercase tracking-widest text-zinc-400 font-semibold border-b border-[var(--border)]"
                >
                  {group.category}
                </td>
              </tr>
              {group.items.map((feat, fi) => (
                <tr
                  key={feat.name}
                  className={`${fi % 2 === 0 ? 'bg-[var(--card)]/30' : ''} hover:bg-[var(--card)]/60 transition-colors`}
                >
                  <td className="py-3 px-4 text-sm text-[var(--foreground)]">{feat.name}</td>
                  {feat.tiers.map((val, ti) => (
                    <td
                      key={ti}
                      className={`py-3 px-3 text-center text-sm ${
                        ti === highlight ? 'bg-gold/5' : ''
                      }`}
                    >
                      {val === true ? (
                        <span className="text-emerald-400">&#10003;</span>
                      ) : val === false ? (
                        <span className="text-zinc-600">—</span>
                      ) : (
                        <span className="text-[var(--foreground)]">{val}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── TierSectionSwitch ─── */
export default function TierSectionSwitch({
  title,
  desc,
  filtered,
  full,
}: {
  title: string;
  desc: string;
  filtered: SectionData;
  full: SectionData;
}) {
  const { adminModeEnabled } = useAdmin();
  const data = adminModeEnabled ? full : filtered;

  return (
    <section>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 rounded-full bg-gold" />
        <h2 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)]">
          {title}
        </h2>
      </div>
      <p className="text-zinc-400 mb-8 max-w-2xl">{desc}</p>

      {/* Tier summary cards */}
      <div className={`grid grid-cols-2 sm:grid-cols-${Math.min(data.cards.length, 4)} gap-3 mb-10`}>
        {data.cards.map((c) => (
          <div key={c.tag} className={`rounded-xl border p-4 ${c.color} transition-colors`}>
            <div className={`text-xs mb-1 tracking-wider uppercase ${c.tagColor}`}>{c.tag}</div>
            <div className="font-semibold text-white text-lg">{c.label}</div>
            <div className="text-sm text-zinc-300 mt-1 leading-relaxed">{c.sub}</div>
          </div>
        ))}
      </div>

      <TierTable
        columns={data.columns}
        columnColors={data.colors}
        features={data.features
          .map((g) => ({ ...g, items: g.items.filter((f) => f.tiers.length > 0) }))
          .filter((g) => g.items.length > 0)}
        highlight={data.highlight}
      />
    </section>
  );
}
