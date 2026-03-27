'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useAdmin } from '@/components/AdminProvider';
import { useAuth } from '@/components/AuthProvider';
import FadeUp from '@/components/animations/FadeUp';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend,
} from 'recharts';

// ─── Types ───────────────────────────────────────────────────────────
interface Expense {
  id: string;
  name: string;
  amount: number;
  category: string;
  currency: string;
  is_recurring: boolean;
  billing_cycle: string;
  start_date: string;
  end_date: string | null;
  notes: string | null;
}

interface Revenue {
  id: string;
  source: string;
  description: string;
  amount: number;
  currency: string;
  revenue_date: string;
  stripe_payment_id: string | null;
  notes: string | null;
}

interface MonthData {
  month: string;
  expenses: number;
  revenue: number;
  net: number;
}

interface FinancialsData {
  months: MonthData[];
  currentMRR: number;
  categoryBreakdown: { category: string; amount: number }[];
}

type MainTab = 'ledger' | 'trends';
type LedgerTab = 'expenses' | 'revenue';
type TrendRange = '6' | '12' | 'all';

// ─── Constants ───────────────────────────────────────────────────────
const CATEGORIES = ['cloud', 'ai', 'workspace', 'virtual_office', 'phone', 'marketing', 'personnel', 'domain', 'other'] as const;
const SOURCES = ['stripe', 'manual', 'sponsorship', 'other'] as const;
const BILLING_CYCLES = ['monthly', 'yearly', 'one_time'] as const;

const CATEGORY_COLORS: Record<string, string> = {
  cloud: '#3b82f6',
  ai: '#a855f7',
  workspace: '#22c55e',
  virtual_office: '#f59e0b',
  phone: '#14b8a6',
  marketing: '#ec4899',
  personnel: '#ef4444',
  domain: '#06b6d4',
  other: '#6b7280',
};

const SOURCE_COLORS: Record<string, string> = {
  stripe: '#a855f7',
  manual: '#3b82f6',
  sponsorship: '#eab308',
  other: '#6b7280',
};

const CATEGORY_KEY_MAP: Record<string, string> = {
  cloud: 'catCloud',
  ai: 'catAi',
  workspace: 'catWorkspace',
  virtual_office: 'catVirtualOffice',
  phone: 'catPhone',
  marketing: 'catMarketing',
  personnel: 'catPersonnel',
  domain: 'catDomain',
  other: 'catOther',
};

const SOURCE_KEY_MAP: Record<string, string> = {
  stripe: 'sourceStripe',
  manual: 'sourceManual',
  sponsorship: 'sourceSponsorship',
  other: 'sourceOther',
};

const CYCLE_KEY_MAP: Record<string, string> = {
  monthly: 'cycleMonthly',
  yearly: 'cycleYearly',
  one_time: 'cycleOneTime',
};

// ─── Chart Styles (matching admin analytics) ─────────────────────────
const chartTooltipStyle: React.CSSProperties = {
  backgroundColor: 'var(--card, #111111)',
  border: '1px solid var(--border, #333)',
  borderRadius: 12,
  fontSize: 12,
  padding: '8px 12px',
  color: 'var(--foreground, #F0EDE6)',
};
const chartTooltipLabelStyle: React.CSSProperties = { color: 'var(--muted-foreground, #8A8578)' };
const chartCursorStyle = { fill: 'rgba(255,255,255,0.04)' };
const axisTickStyle = { fontSize: 10, fill: '#666' };

// ─── Helper ──────────────────────────────────────────────────────────
function formatUSD(n: number) {
  return '$' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Sub-components ──────────────────────────────────────────────────

function CategoryBadge({ category, t }: { category: string; t: (k: string) => string }) {
  const color = CATEGORY_COLORS[category] || CATEGORY_COLORS.other;
  const label = t(CATEGORY_KEY_MAP[category] || 'catOther');
  return (
    <span
      className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{ backgroundColor: color + '20', color }}
    >
      {label}
    </span>
  );
}

function SourceBadge({ source, t }: { source: string; t: (k: string) => string }) {
  const color = SOURCE_COLORS[source] || SOURCE_COLORS.other;
  const label = t(SOURCE_KEY_MAP[source] || 'sourceOther');
  return (
    <span
      className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{ backgroundColor: color + '20', color }}
    >
      {label}
    </span>
  );
}

function CycleBadge({ cycle, t }: { cycle: string; t: (k: string) => string }) {
  const label = t(CYCLE_KEY_MAP[cycle] || cycle);
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--muted)] text-[var(--muted-foreground)]">
      {label}
    </span>
  );
}

// ─── Expense Form ────────────────────────────────────────────────────
function ExpenseForm({
  initial,
  onSave,
  onCancel,
  t,
  saving,
}: {
  initial?: Partial<Expense>;
  onSave: (data: Record<string, unknown>) => void;
  onCancel: () => void;
  t: (k: string) => string;
  saving: boolean;
}) {
  const [name, setName] = useState(initial?.name || '');
  const [amount, setAmount] = useState(initial?.amount?.toString() || '');
  const [category, setCategory] = useState(initial?.category || 'cloud');
  const [billingCycle, setBillingCycle] = useState(initial?.billing_cycle || 'monthly');
  const [startDate, setStartDate] = useState(initial?.start_date || '');
  const [endDate, setEndDate] = useState(initial?.end_date || '');
  const [notes, setNotes] = useState(initial?.notes || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      amount: parseFloat(amount),
      category,
      billing_cycle: billingCycle,
      is_recurring: billingCycle !== 'one_time',
      start_date: startDate,
      end_date: endDate || null,
      notes: notes || null,
    });
  };

  const inputCls = 'w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:border-red-400/50';

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-[var(--muted-foreground)] mb-1 block">{t('expenseName')}</label>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="text-xs text-[var(--muted-foreground)] mb-1 block">{t('expenseAmount')}</label>
          <input className={inputCls} type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </div>
        <div>
          <label className="text-xs text-[var(--muted-foreground)] mb-1 block">{t('expenseCategory')}</label>
          <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{t(CATEGORY_KEY_MAP[c])}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-[var(--muted-foreground)] mb-1 block">{t('expenseBillingCycle')}</label>
          <div className="flex gap-2 mt-1">
            {BILLING_CYCLES.map((bc) => (
              <button
                key={bc}
                type="button"
                onClick={() => setBillingCycle(bc)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                  billingCycle === bc
                    ? 'bg-red-400/15 text-red-400 font-semibold'
                    : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
                }`}
              >
                {t(CYCLE_KEY_MAP[bc])}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-[var(--muted-foreground)] mb-1 block">{t('expenseStartDate')}</label>
          <input className={inputCls} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
        </div>
        <div>
          <label className="text-xs text-[var(--muted-foreground)] mb-1 block">{t('expenseEndDate')}</label>
          <input className={inputCls} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="text-xs text-[var(--muted-foreground)] mb-1 block">{t('expenseNotes')}</label>
        <textarea className={inputCls + ' h-16 resize-none'} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
          {t('cancel')}
        </button>
        <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl text-xs bg-red-400/15 text-red-400 font-semibold hover:bg-red-400/25 transition-colors disabled:opacity-50">
          {t('save')}
        </button>
      </div>
    </form>
  );
}

// ─── Revenue Form ────────────────────────────────────────────────────
function RevenueForm({
  initial,
  onSave,
  onCancel,
  t,
  saving,
}: {
  initial?: Partial<Revenue>;
  onSave: (data: Record<string, unknown>) => void;
  onCancel: () => void;
  t: (k: string) => string;
  saving: boolean;
}) {
  const [description, setDescription] = useState(initial?.description || '');
  const [amount, setAmount] = useState(initial?.amount?.toString() || '');
  const [source, setSource] = useState(initial?.source || 'manual');
  const [revenueDate, setRevenueDate] = useState(initial?.revenue_date || '');
  const [notes, setNotes] = useState(initial?.notes || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      description,
      amount: parseFloat(amount),
      source,
      revenue_date: revenueDate,
      notes: notes || null,
    });
  };

  const inputCls = 'w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:border-red-400/50';

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-[var(--muted-foreground)] mb-1 block">{t('revenueDescription')}</label>
          <input className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} required />
        </div>
        <div>
          <label className="text-xs text-[var(--muted-foreground)] mb-1 block">{t('expenseAmount')}</label>
          <input className={inputCls} type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </div>
        <div>
          <label className="text-xs text-[var(--muted-foreground)] mb-1 block">{t('revenueSource')}</label>
          <select className={inputCls} value={source} onChange={(e) => setSource(e.target.value)}>
            {SOURCES.map((s) => (
              <option key={s} value={s}>{t(SOURCE_KEY_MAP[s])}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-[var(--muted-foreground)] mb-1 block">{t('revenueDate')}</label>
          <input className={inputCls} type="date" value={revenueDate} onChange={(e) => setRevenueDate(e.target.value)} required />
        </div>
      </div>
      <div>
        <label className="text-xs text-[var(--muted-foreground)] mb-1 block">{t('expenseNotes')}</label>
        <textarea className={inputCls + ' h-16 resize-none'} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
          {t('cancel')}
        </button>
        <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl text-xs bg-red-400/15 text-red-400 font-semibold hover:bg-red-400/25 transition-colors disabled:opacity-50">
          {t('save')}
        </button>
      </div>
    </form>
  );
}

// ─── Confirm Dialog ──────────────────────────────────────────────────
function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
  t,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  t: (k: string) => string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 max-w-sm mx-4">
        <p className="text-sm text-[var(--foreground)] mb-4">{message}</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
            {t('cancel')}
          </button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-xl text-xs bg-red-500/15 text-red-400 font-semibold hover:bg-red-500/25 transition-colors">
            {t('delete')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Toast ───────────────────────────────────────────────────────────
function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 2000);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="fixed bottom-6 right-6 z-50 bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--foreground)] shadow-lg animate-in fade-in slide-in-from-bottom-3">
      {message}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// Main Page
// ═════════════════════════════════════════════════════════════════════
export default function FinancialsPage() {
  const t = useTranslations('ownerHQ');
  const { token } = useAdmin();
  const { profile } = useAuth();

  // ─── State ───────────────────────────────────────────────────────
  const [mainTab, setMainTab] = useState<MainTab>('ledger');
  const [ledgerTab, setLedgerTab] = useState<LedgerTab>('expenses');
  const [trendRange, setTrendRange] = useState<TrendRange>('12');

  // Data
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [revenueList, setRevenueList] = useState<Revenue[]>([]);
  const [financials, setFinancials] = useState<FinancialsData | null>(null);
  const [loading, setLoading] = useState(true);

  // Forms
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showRevenueForm, setShowRevenueForm] = useState(false);
  const [editingRevenue, setEditingRevenue] = useState<Revenue | null>(null);
  const [saving, setSaving] = useState(false);

  // Confirm / Toast
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'expense' | 'revenue'; id: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // ─── Fetch helpers ───────────────────────────────────────────────
  // Use token from useAdmin() (set via getSession()) — never call
  // refreshSession() which races with the proxy middleware's token rotation.
  const fetchExpenses = useCallback(async () => {
    if (!token) return;
    const res = await fetch('/api/owner/expenses', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.expenses) setExpenses(data.expenses);
  }, [token]);

  const fetchRevenue = useCallback(async () => {
    if (!token) return;
    const res = await fetch('/api/owner/revenue', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.revenue) setRevenueList(data.revenue);
  }, [token]);

  const fetchFinancials = useCallback(async (months: string) => {
    if (!token) return;
    const param = months === 'all' ? '120' : months;
    const res = await fetch(`/api/owner/financials?months=${param}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.months) setFinancials(data);
  }, [token]);

  // ─── Initial load ────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        await Promise.all([fetchExpenses(), fetchRevenue(), fetchFinancials(trendRange)]);
      } catch (err) {
        console.error('Failed to load financials:', err);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Refetch financials when range changes
  useEffect(() => {
    fetchFinancials(trendRange);
  }, [trendRange, fetchFinancials]);

  // ─── Monthly total (from expenses data) ──────────────────────────
  const monthlyExpenseTotal = useMemo(() => {
    let total = 0;
    for (const exp of expenses) {
      if (exp.is_recurring && exp.billing_cycle === 'monthly') {
        total += Number(exp.amount);
      } else if (exp.is_recurring && exp.billing_cycle === 'yearly') {
        total += Number(exp.amount) / 12;
      }
    }
    return Math.round(total * 100) / 100;
  }, [expenses]);

  // This month's revenue
  const thisMonthRevenue = useMemo(() => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    let total = 0;
    for (const r of revenueList) {
      if (r.revenue_date.startsWith(ym)) {
        total += Number(r.amount);
      }
    }
    return Math.round(total * 100) / 100;
  }, [revenueList]);

  // ─── CRUD handlers ──────────────────────────────────────────────
  const handleSaveExpense = async (data: Record<string, unknown>) => {
    if (!token) return;
    setSaving(true);
    try {
      const isEdit = !!editingExpense;
      const url = isEdit ? `/api/owner/expenses/${editingExpense!.id}` : '/api/owner/expenses';
      const method = isEdit ? 'PATCH' : 'POST';
      await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      setShowExpenseForm(false);
      setEditingExpense(null);
      setToast(t('saved'));
      await Promise.all([fetchExpenses(), fetchFinancials(trendRange)]);
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  };

  const handleSaveRevenue = async (data: Record<string, unknown>) => {
    if (!token) return;
    setSaving(true);
    try {
      const isEdit = !!editingRevenue;
      const url = isEdit ? `/api/owner/revenue/${editingRevenue!.id}` : '/api/owner/revenue';
      const method = isEdit ? 'PATCH' : 'POST';
      await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      setShowRevenueForm(false);
      setEditingRevenue(null);
      setToast(t('saved'));
      await Promise.all([fetchRevenue(), fetchFinancials(trendRange)]);
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget || !token) return;
    try {
      const url = deleteTarget.type === 'expense'
        ? `/api/owner/expenses/${deleteTarget.id}`
        : `/api/owner/revenue/${deleteTarget.id}`;
      await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setDeleteTarget(null);
      setToast(t('deleted'));
      await Promise.all([fetchExpenses(), fetchRevenue(), fetchFinancials(trendRange)]);
    } catch (err) {
      console.error(err);
    }
  };

  // ─── Trend data ──────────────────────────────────────────────────
  const trendMonths = useMemo(() => {
    if (!financials) return [];
    return financials.months;
  }, [financials]);

  const currentMonthData = useMemo(() => {
    if (!trendMonths.length) return { expenses: 0, revenue: 0, net: 0 };
    return trendMonths[trendMonths.length - 1];
  }, [trendMonths]);

  // ─── Loading ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="w-6 h-6 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <FadeUp>
        <div>
          <h1 className="font-serif text-3xl font-bold">{t('financials')}</h1>
        </div>
      </FadeUp>

      {/* Main Tabs */}
      <FadeUp>
        <div className="flex gap-1 bg-[var(--muted)] rounded-xl p-1 self-start w-fit">
          {(['ledger', 'trends'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setMainTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm transition-all ${
                mainTab === tab
                  ? 'bg-[var(--card)] text-red-400 font-semibold shadow-sm'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
            >
              {t(tab)}
            </button>
          ))}
        </div>
      </FadeUp>

      {/* ═══════ LEDGER TAB ═══════ */}
      {mainTab === 'ledger' && (
        <>
          {/* Sub-tabs */}
          <FadeUp>
            <div className="flex gap-1 bg-[var(--muted)] rounded-xl p-1 self-start w-fit">
              {(['expenses', 'revenue'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setLedgerTab(tab)}
                  className={`px-4 py-1.5 rounded-lg text-xs transition-all ${
                    ledgerTab === tab
                      ? 'bg-[var(--card)] text-red-400 font-semibold shadow-sm'
                      : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                  }`}
                >
                  {t(tab)}
                </button>
              ))}
            </div>
          </FadeUp>

          {/* ─── Expenses ─── */}
          {ledgerTab === 'expenses' && (
            <div className="space-y-4">
              {/* Summary Card */}
              <FadeUp>
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
                  <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-widest mb-1">{t('monthlyTotal')}</p>
                  <p className="text-2xl font-bold text-red-400">{formatUSD(monthlyExpenseTotal)}</p>
                  <p className="text-[10px] text-[var(--muted-foreground)] mt-1">{t('cycleMonthly')}</p>
                </div>
              </FadeUp>

              {/* Add Button */}
              <FadeUp>
                <button
                  onClick={() => { setShowExpenseForm(true); setEditingExpense(null); }}
                  className="px-4 py-2 rounded-xl text-xs bg-red-400/15 text-red-400 font-semibold hover:bg-red-400/25 transition-colors"
                >
                  + {t('addExpense')}
                </button>
              </FadeUp>

              {/* Add/Edit Form */}
              {(showExpenseForm || editingExpense) && (
                <FadeUp>
                  <ExpenseForm
                    initial={editingExpense || undefined}
                    onSave={handleSaveExpense}
                    onCancel={() => { setShowExpenseForm(false); setEditingExpense(null); }}
                    t={t}
                    saving={saving}
                  />
                </FadeUp>
              )}

              {/* Expense List */}
              {expenses.length === 0 ? (
                <FadeUp>
                  <p className="text-sm text-[var(--muted-foreground)] text-center py-12">{t('noExpenses')}</p>
                </FadeUp>
              ) : (
                <div className="space-y-3">
                  {expenses.map((exp) => (
                    <FadeUp key={exp.id}>
                      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1.5">
                              <span className="font-semibold text-sm">{exp.name}</span>
                              <CategoryBadge category={exp.category} t={t} />
                              <CycleBadge cycle={exp.billing_cycle} t={t} />
                            </div>
                            <p className="text-xl font-bold text-red-400">{formatUSD(exp.amount)}</p>
                            {exp.notes && (
                              <p className="text-xs text-[var(--muted-foreground)] mt-1">{exp.notes}</p>
                            )}
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button
                              onClick={() => { setEditingExpense(exp); setShowExpenseForm(false); }}
                              className="p-2 rounded-lg hover:bg-[var(--muted)] transition-colors text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                            >
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => setDeleteTarget({ type: 'expense', id: exp.id })}
                              className="p-2 rounded-lg hover:bg-red-500/10 transition-colors text-[var(--muted-foreground)] hover:text-red-400"
                            >
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </FadeUp>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── Revenue ─── */}
          {ledgerTab === 'revenue' && (
            <div className="space-y-4">
              {/* Summary Card */}
              <FadeUp>
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
                  <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-widest mb-1">{t('monthlyRevenue')}</p>
                  <p className="text-2xl font-bold text-emerald-400">{formatUSD(thisMonthRevenue)}</p>
                </div>
              </FadeUp>

              {/* Add Button */}
              <FadeUp>
                <button
                  onClick={() => { setShowRevenueForm(true); setEditingRevenue(null); }}
                  className="px-4 py-2 rounded-xl text-xs bg-red-400/15 text-red-400 font-semibold hover:bg-red-400/25 transition-colors"
                >
                  + {t('addRevenue')}
                </button>
              </FadeUp>

              {/* Add/Edit Form */}
              {(showRevenueForm || editingRevenue) && (
                <FadeUp>
                  <RevenueForm
                    initial={editingRevenue || undefined}
                    onSave={handleSaveRevenue}
                    onCancel={() => { setShowRevenueForm(false); setEditingRevenue(null); }}
                    t={t}
                    saving={saving}
                  />
                </FadeUp>
              )}

              {/* Revenue List */}
              {revenueList.length === 0 ? (
                <FadeUp>
                  <p className="text-sm text-[var(--muted-foreground)] text-center py-12">{t('noRevenue')}</p>
                </FadeUp>
              ) : (
                <div className="space-y-3">
                  {revenueList.map((rev) => (
                    <FadeUp key={rev.id}>
                      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1.5">
                              <span className="font-semibold text-sm">{rev.description}</span>
                              <SourceBadge source={rev.source} t={t} />
                            </div>
                            <p className="text-xl font-bold text-emerald-400">{formatUSD(rev.amount)}</p>
                            <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">{rev.revenue_date}</p>
                            {rev.notes && (
                              <p className="text-xs text-[var(--muted-foreground)] mt-1">{rev.notes}</p>
                            )}
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button
                              onClick={() => { setEditingRevenue(rev); setShowRevenueForm(false); }}
                              className="p-2 rounded-lg hover:bg-[var(--muted)] transition-colors text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                            >
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => setDeleteTarget({ type: 'revenue', id: rev.id })}
                              className="p-2 rounded-lg hover:bg-red-500/10 transition-colors text-[var(--muted-foreground)] hover:text-red-400"
                            >
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </FadeUp>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ═══════ TRENDS TAB ═══════ */}
      {mainTab === 'trends' && (
        <div className="space-y-6">
          {/* Period Selector */}
          <FadeUp>
            <div className="flex gap-1 bg-[var(--muted)] rounded-xl p-1 self-start w-fit">
              {([
                { key: '6' as TrendRange, label: '6M' },
                { key: '12' as TrendRange, label: '12M' },
                { key: 'all' as TrendRange, label: 'All' },
              ]).map((r) => (
                <button
                  key={r.key}
                  onClick={() => setTrendRange(r.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                    trendRange === r.key
                      ? 'bg-[var(--card)] text-red-400 font-semibold shadow-sm'
                      : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </FadeUp>

          {/* KPI Cards */}
          <FadeUp>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* MRR / Burn */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
                <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-widest mb-1">{t('mrr')}</p>
                <p className="text-2xl font-bold text-red-400">{formatUSD(financials?.currentMRR || 0)}</p>
              </div>
              {/* Revenue */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
                <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-widest mb-1">{t('revenue')}</p>
                <p className="text-2xl font-bold text-emerald-400">{formatUSD(currentMonthData.revenue)}</p>
              </div>
              {/* Net */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
                <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-widest mb-1">{t('netIncome')}</p>
                <p className={`text-2xl font-bold ${currentMonthData.net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatUSD(currentMonthData.net)}
                </p>
              </div>
            </div>
          </FadeUp>

          {/* P&L Trend Chart */}
          <FadeUp>
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
              <h2 className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-bold mb-5">{t('plTrend')}</h2>
              {trendMonths.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={trendMonths}>
                      <defs>
                        <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradExpenses" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis
                        dataKey="month"
                        tick={axisTickStyle}
                        tickFormatter={(v: string) => {
                          const [, m] = v.split('-');
                          const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                          return months[parseInt(m, 10) - 1] || v;
                        }}
                        interval="preserveStartEnd"
                      />
                      <YAxis tick={axisTickStyle} width={50} tickFormatter={(v: number) => `$${v}`} />
                      <Tooltip
                        contentStyle={chartTooltipStyle}
                        labelStyle={chartTooltipLabelStyle}
                        cursor={chartCursorStyle}
                        formatter={(value) => formatUSD(Number(value ?? 0))}
                        labelFormatter={(label) => {
                          const [y, m] = label.split('-');
                          const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                          return `${months[parseInt(m, 10) - 1]} ${y}`;
                        }}
                      />
                      <Area type="monotone" dataKey="revenue" name={t('revenue')} stroke="#22c55e" fill="url(#gradRevenue)" strokeWidth={2} dot={false} />
                      <Area type="monotone" dataKey="expenses" name={t('expenses')} stroke="#ef4444" fill="url(#gradExpenses)" strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                  <div className="flex items-center gap-5 mt-3 ml-1">
                    <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                      <div className="w-3 h-[3px] rounded-full bg-emerald-500" />
                      {t('revenue')}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                      <div className="w-3 h-[3px] rounded-full bg-red-500" />
                      {t('expenses')}
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-[var(--muted-foreground)] text-center py-12">No data</p>
              )}
            </div>
          </FadeUp>

          {/* Category Breakdown + Monthly P&L side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <FadeUp>
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
                <h2 className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-bold mb-5">{t('categoryBreakdown')}</h2>
                {financials && financials.categoryBreakdown.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie
                          data={financials.categoryBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={2}
                          dataKey="amount"
                          nameKey="category"
                        >
                          {financials.categoryBreakdown.map((entry) => (
                            <Cell key={entry.category} fill={CATEGORY_COLORS[entry.category] || CATEGORY_COLORS.other} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={chartTooltipStyle}
                          formatter={(value) => formatUSD(Number(value ?? 0))}
                          labelFormatter={(label) => t(CATEGORY_KEY_MAP[String(label)] || 'catOther')}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap gap-3 mt-2">
                      {financials.categoryBreakdown.map((entry) => (
                        <div key={entry.category} className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[entry.category] || CATEGORY_COLORS.other }} />
                          <span>{t(CATEGORY_KEY_MAP[entry.category] || 'catOther')}</span>
                          <span className="font-medium text-[var(--foreground)]">{formatUSD(entry.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-[var(--muted-foreground)] text-center py-12">{t('noExpenses')}</p>
                )}
              </div>
            </FadeUp>

            {/* Monthly P&L Table */}
            <FadeUp>
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
                <h2 className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-bold mb-5">{t('monthlyPL')}</h2>
                {trendMonths.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-[var(--muted-foreground)] border-b border-[var(--border)]">
                          <th className="text-left py-2 font-medium">{t('month')}</th>
                          <th className="text-right py-2 font-medium">{t('revenue')}</th>
                          <th className="text-right py-2 font-medium">{t('expenses')}</th>
                          <th className="text-right py-2 font-medium">{t('net')}</th>
                          <th className="text-right py-2 font-medium">{t('change')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...trendMonths].reverse().map((row, i, arr) => {
                          const prevRow = arr[i + 1]; // previous month (arr is reversed)
                          let changeStr = '—';
                          if (prevRow && prevRow.net !== 0) {
                            const changePct = Math.round(((row.net - prevRow.net) / Math.abs(prevRow.net)) * 100);
                            changeStr = `${changePct > 0 ? '+' : ''}${changePct}%`;
                          }
                          const monthLabel = (() => {
                            const [y, m] = row.month.split('-');
                            const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                            return `${months[parseInt(m, 10) - 1]} ${y}`;
                          })();
                          return (
                            <tr key={row.month} className="border-b border-[var(--border)]/50 last:border-0">
                              <td className="py-2 text-[var(--foreground)]">{monthLabel}</td>
                              <td className="py-2 text-right text-emerald-400">{formatUSD(row.revenue)}</td>
                              <td className="py-2 text-right text-red-400">{formatUSD(row.expenses)}</td>
                              <td className={`py-2 text-right font-medium ${row.net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {formatUSD(row.net)}
                              </td>
                              <td className="py-2 text-right text-[var(--muted-foreground)]">{changeStr}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--muted-foreground)] text-center py-12">No data</p>
                )}
              </div>
            </FadeUp>
          </div>
        </div>
      )}

      {/* ═══════ Modals & Toast ═══════ */}
      {deleteTarget && (
        <ConfirmDialog
          message={t('confirmDelete')}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          t={t}
        />
      )}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
