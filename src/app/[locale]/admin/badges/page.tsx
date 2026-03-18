'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useAdmin } from '@/components/AdminProvider';

// ---------- Types ----------

interface Badge {
  badge_id: string;
  name_en: string | null;
  name_zh: string | null;
  name_ja: string | null;
  name_ko: string | null;
  name_th: string | null;
  name_id: string | null;
  description_en: string | null;
  description_zh: string | null;
  description_ja: string | null;
  description_ko: string | null;
  description_th: string | null;
  description_id: string | null;
  category: string | null;
  target_type: string | null;
  sort_order: number;
  criteria_target: number | null;
  is_active: boolean;
}

type TabKey = 'user' | 'artist' | 'venue' | 'uncategorized';

const TABS: { key: TabKey; labelKey: string }[] = [
  { key: 'user', labelKey: 'tabUser' },
  { key: 'artist', labelKey: 'tabArtist' },
  { key: 'venue', labelKey: 'tabVenue' },
  { key: 'uncategorized', labelKey: 'tabUncategorized' },
];

const LOCALES = ['en', 'zh', 'ja', 'ko', 'th', 'id'] as const;
const LOCALE_LABELS: Record<string, string> = {
  en: 'EN', zh: 'ZH', ja: 'JA', ko: 'KO', th: 'TH', id: 'ID',
};

// ---------- Component ----------

export default function BadgesPage() {
  const { token } = useAdmin();
  const t = useTranslations('adminHQ');
  const locale = useLocale();

  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('user');
  const [editBadge, setEditBadge] = useState<Badge | null>(null);
  const [translating, setTranslating] = useState(false);

  // Track original state for cancel
  const [originalBadges, setOriginalBadges] = useState<Badge[]>([]);

  // ---------- Fetch ----------

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/badges', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!cancelled && data.badges) {
          setBadges(data.badges);
          setOriginalBadges(data.badges);
        }
      } catch (err) {
        console.error('Failed to fetch badges:', err);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [token]);

  // ---------- Handlers ----------

  const toggleActive = (badgeId: string) => {
    setBadges((prev) =>
      prev.map((b) =>
        b.badge_id === badgeId ? { ...b, is_active: !b.is_active } : b,
      ),
    );
    setDirty(true);
    setSaved(false);
  };

  const openEdit = (badge: Badge) => {
    setEditBadge({ ...badge });
  };

  const updateEditField = (field: string, value: string | number | null) => {
    if (!editBadge) return;
    setEditBadge({ ...editBadge, [field]: value });
  };

  const confirmEdit = () => {
    if (!editBadge) return;
    setBadges((prev) =>
      prev.map((b) => (b.badge_id === editBadge.badge_id ? editBadge : b)),
    );
    setEditBadge(null);
    setDirty(true);
    setSaved(false);
  };

  const handleAutoTranslate = async () => {
    if (!editBadge || !token) return;
    setTranslating(true);
    try {
      const res = await fetch('/api/admin/badges/translate', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name_en: editBadge.name_en,
          description_en: editBadge.description_en,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setEditBadge({
          ...editBadge,
          name_zh: data.name_zh || editBadge.name_zh,
          name_ja: data.name_ja || editBadge.name_ja,
          name_ko: data.name_ko || editBadge.name_ko,
          name_th: data.name_th || editBadge.name_th,
          name_id: data.name_id || editBadge.name_id,
          description_zh: data.description_zh || editBadge.description_zh,
          description_ja: data.description_ja || editBadge.description_ja,
          description_ko: data.description_ko || editBadge.description_ko,
          description_th: data.description_th || editBadge.description_th,
          description_id: data.description_id || editBadge.description_id,
        });
      }
    } catch (err) {
      console.error('Translation failed:', err);
    }
    setTranslating(false);
  };

  const handleSave = async () => {
    if (!token || saving) return;
    setSaving(true);

    // Find changed badges by comparing with original
    const changed = badges.filter((b) => {
      const orig = originalBadges.find((o) => o.badge_id === b.badge_id);
      return !orig || JSON.stringify(b) !== JSON.stringify(orig);
    });

    try {
      for (const badge of changed) {
        const { badge_id, ...fields } = badge;
        await fetch('/api/admin/badges', {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            badge_id,
            is_active: fields.is_active,
            criteria_target: fields.criteria_target,
            name_en: fields.name_en,
            name_zh: fields.name_zh,
            name_ja: fields.name_ja,
            name_ko: fields.name_ko,
            name_th: fields.name_th,
            name_id: fields.name_id,
            description_en: fields.description_en,
            description_zh: fields.description_zh,
            description_ja: fields.description_ja,
            description_ko: fields.description_ko,
            description_th: fields.description_th,
            description_id: fields.description_id,
          }),
        });
      }
      setOriginalBadges(badges);
      setSaved(true);
      setDirty(false);
    } catch (err) {
      console.error('Failed to save:', err);
    }
    setSaving(false);
  };

  const handleCancel = () => {
    setBadges(originalBadges);
    setDirty(false);
    setSaved(false);
  };

  // ---------- Helpers ----------

  const getName = (b: Badge) => {
    const key = `name_${locale}` as keyof Badge;
    return (b[key] as string) || b.name_en || b.badge_id;
  };

  const getDesc = (b: Badge) => {
    const key = `description_${locale}` as keyof Badge;
    return (b[key] as string) || b.description_en || '';
  };

  const filteredBadges = badges.filter((b) => {
    if (activeTab === 'uncategorized') return !b.target_type;
    return b.target_type === activeTab;
  });

  // Group by category
  const categories = [...new Set(filteredBadges.map((b) => b.category || 'other'))];

  const categoryLabel = (cat: string) => {
    const map: Record<string, string> = {
      milestone: 'Milestone',
      community: 'Community',
      recognition: 'Recognition',
      venue_excellence: 'Venue Excellence',
      other: 'Other',
    };
    return map[cat] || cat;
  };

  // ---------- Render ----------

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="w-6 h-6 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold">{t('badgesTitle')}</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">{t('badgesDesc')}</p>
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <button
              onClick={handleCancel}
              className="px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--foreground)]/30 transition-all"
            >
              {t('cancel')}
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!dirty || saving}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
              dirty
                ? 'bg-[var(--color-gold)] text-[#0A0A0A] hover:opacity-90'
                : saved
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-[var(--muted)] text-[var(--muted-foreground)] cursor-not-allowed'
            }`}
          >
            {saving ? '...' : saved ? t('saved') : t('save')}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] pb-0">
        {TABS.map((tab) => {
          const count = badges.filter((b) =>
            tab.key === 'uncategorized' ? !b.target_type : b.target_type === tab.key,
          ).length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-[1px] ${
                activeTab === tab.key
                  ? 'border-[var(--color-gold)] text-[var(--color-gold)]'
                  : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
            >
              {t(tab.labelKey)}
              <span className="ml-1.5 text-xs opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Badge List */}
      {filteredBadges.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)] py-8 text-center">{t('noBadges')}</p>
      ) : (
        <div className="space-y-6">
          {categories.map((cat) => {
            const catBadges = filteredBadges.filter(
              (b) => (b.category || 'other') === cat,
            );
            if (catBadges.length === 0) return null;
            return (
              <div key={cat}>
                <h3 className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-semibold mb-3 pb-2 border-b border-[var(--border)]">
                  {categoryLabel(cat)}
                </h3>
                <div className="space-y-1">
                  {catBadges.map((badge) => (
                    <div
                      key={badge.badge_id}
                      className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all hover:bg-[var(--card)]/60 ${
                        !badge.is_active ? 'opacity-40' : ''
                      }`}
                    >
                      {/* Toggle */}
                      <button
                        onClick={() => toggleActive(badge.badge_id)}
                        className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${
                          badge.is_active
                            ? 'bg-emerald-500'
                            : 'bg-zinc-600'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                            badge.is_active ? 'left-5.5 translate-x-0' : 'left-0.5'
                          }`}
                          style={{ left: badge.is_active ? '22px' : '2px' }}
                        />
                      </button>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">
                            {getName(badge)}
                          </span>
                          <span className="text-[10px] font-mono text-[var(--muted-foreground)] bg-[var(--muted)] px-1.5 py-0.5 rounded">
                            {badge.badge_id}
                          </span>
                          {badge.criteria_target && (
                            <span className="text-[10px] text-[var(--muted-foreground)] bg-[var(--muted)] px-1.5 py-0.5 rounded">
                              target: {badge.criteria_target}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--muted-foreground)] truncate mt-0.5">
                          {getDesc(badge)}
                        </p>
                      </div>

                      {/* Edit button */}
                      <button
                        onClick={() => openEdit(badge)}
                        className="shrink-0 p-2 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-all"
                        title={t('editBadge')}
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      {editBadge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--background)] border border-[var(--border)] rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto mx-4 p-6 space-y-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif text-xl font-bold">{t('editBadge')}</h2>
                <p className="text-xs font-mono text-[var(--muted-foreground)] mt-0.5">
                  {editBadge.badge_id}
                </p>
              </div>
              <button
                onClick={handleAutoTranslate}
                disabled={translating || !editBadge.name_en?.trim()}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                  translating
                    ? 'bg-[var(--muted)] text-[var(--muted-foreground)] cursor-wait'
                    : 'bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25'
                }`}
              >
                {translating ? t('translating') : t('autoTranslate')}
              </button>
            </div>

            {/* Name fields */}
            <div className="space-y-3">
              <h3 className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-semibold">
                {t('badgeName')}
              </h3>
              {LOCALES.map((loc) => {
                const field = `name_${loc}` as keyof Badge;
                return (
                  <div key={field} className="flex items-center gap-3">
                    <span className="text-xs font-mono text-[var(--muted-foreground)] w-6 shrink-0">
                      {LOCALE_LABELS[loc]}
                    </span>
                    <input
                      type="text"
                      value={(editBadge[field] as string) || ''}
                      onChange={(e) => updateEditField(field, e.target.value)}
                      className="flex-1 bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--color-gold)]/50"
                      placeholder={`Name (${LOCALE_LABELS[loc]})`}
                    />
                  </div>
                );
              })}
            </div>

            {/* Description fields */}
            <div className="space-y-3">
              <h3 className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-semibold">
                {t('badgeDescription')}
              </h3>
              {LOCALES.map((loc) => {
                const field = `description_${loc}` as keyof Badge;
                return (
                  <div key={field} className="flex items-center gap-3">
                    <span className="text-xs font-mono text-[var(--muted-foreground)] w-6 shrink-0">
                      {LOCALE_LABELS[loc]}
                    </span>
                    <input
                      type="text"
                      value={(editBadge[field] as string) || ''}
                      onChange={(e) => updateEditField(field, e.target.value)}
                      className="flex-1 bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--color-gold)]/50"
                      placeholder={`Description (${LOCALE_LABELS[loc]})`}
                    />
                  </div>
                );
              })}
            </div>

            {/* Criteria Target */}
            <div className="flex items-center gap-3">
              <h3 className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-semibold">
                {t('criteriaTarget')}
              </h3>
              <input
                type="number"
                value={editBadge.criteria_target ?? ''}
                onChange={(e) =>
                  updateEditField(
                    'criteria_target',
                    e.target.value ? parseInt(e.target.value, 10) : null,
                  )
                }
                className="w-24 bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--color-gold)]/50"
                placeholder="—"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border)]">
              <button
                onClick={() => setEditBadge(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--foreground)]/30 transition-all"
              >
                {t('cancel')}
              </button>
              <button
                onClick={confirmEdit}
                className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest bg-[var(--color-gold)] text-[#0A0A0A] hover:opacity-90 transition-all"
              >
                {t('save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
