'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface VersionGroup {
  version: string;
  html: string[];
}

export default function ReleasedClient({
  groups,
  error,
}: {
  groups: VersionGroup[];
  error: boolean;
}) {
  const t = useTranslations('adminHQ');
  const [activeVersion, setActiveVersion] = useState<string>(groups[0]?.version ?? '');

  const activeGroup = groups.find((g) => g.version === activeVersion);

  return (
    <div className="py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t('releasedTitle')}</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">{t('releasedDesc')}</p>
      </div>

      {error ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-8 text-center">
          <p className="text-zinc-400">Unable to load release notes. Please try again later.</p>
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-8 text-center">
          <p className="text-zinc-400">No release notes yet.</p>
        </div>
      ) : (
        <>
          {/* Version tabs */}
          <div className="flex items-center gap-2 border-b border-[var(--border)] pb-0 overflow-x-auto no-scrollbar mb-6">
            {groups.map((group) => (
              <button
                key={group.version}
                onClick={() => setActiveVersion(group.version)}
                className={`px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-[1px] whitespace-nowrap ${
                  activeVersion === group.version
                    ? 'border-[var(--color-gold)] text-[var(--color-gold)]'
                    : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                }`}
              >
                {group.version || 'General'}
                <span className="ml-1.5 text-xs opacity-60">({group.html.length})</span>
              </button>
            ))}
          </div>

          {/* Content */}
          {activeGroup && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)]/50 p-6">
              <div className="notion-content">
                {activeGroup.html.map((html, i) => (
                  <div key={i} dangerouslySetInnerHTML={{ __html: html }} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
