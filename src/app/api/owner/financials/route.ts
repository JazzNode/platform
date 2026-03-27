import { NextRequest, NextResponse } from 'next/server';
import { verifyOwnerToken } from '@/lib/admin-auth';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * GET /api/owner/financials — Aggregate financial data for trends
 * Query params: ?months=12 (how many months back, default 12)
 */
export async function GET(request: NextRequest) {
  const { isOwner } = await verifyOwnerToken(
    request.headers.get('authorization'),
  );
  if (!isOwner) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const monthsParam = request.nextUrl.searchParams.get('months');
  const monthsBack = monthsParam ? parseInt(monthsParam, 10) : 12;

  const supabase = createAdminClient();

  // Fetch all expenses and revenue
  const [expensesRes, revenueRes] = await Promise.all([
    supabase.from('company_expenses').select('*'),
    supabase.from('company_revenue').select('*'),
  ]);

  if (expensesRes.error) {
    return NextResponse.json({ error: expensesRes.error.message }, { status: 500 });
  }
  if (revenueRes.error) {
    return NextResponse.json({ error: revenueRes.error.message }, { status: 500 });
  }

  const expenses = expensesRes.data || [];
  const revenueEntries = revenueRes.data || [];

  // Generate month keys for the requested range
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-based

  const monthKeys: string[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(currentYear, currentMonth - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    monthKeys.push(`${y}-${m}`);
  }

  // Calculate expenses per month
  function getExpenseForMonth(monthKey: string): number {
    const [yearStr, monthStr] = monthKey.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10); // 1-based

    let total = 0;
    for (const exp of expenses) {
      const startDate = new Date(exp.start_date);
      const startYear = startDate.getFullYear();
      const startMonth = startDate.getMonth() + 1; // 1-based
      const startKey = `${startYear}-${String(startMonth).padStart(2, '0')}`;

      // Check if expense has ended
      if (exp.end_date) {
        const endDate = new Date(exp.end_date);
        const endYear = endDate.getFullYear();
        const endMonth = endDate.getMonth() + 1;
        const endKey = `${endYear}-${String(endMonth).padStart(2, '0')}`;
        if (monthKey > endKey) continue;
      }

      // Skip if before start
      if (monthKey < startKey) continue;

      if (exp.is_recurring && exp.billing_cycle === 'monthly') {
        total += Number(exp.amount);
      } else if (exp.is_recurring && exp.billing_cycle === 'yearly') {
        total += Number(exp.amount) / 12;
      } else if (!exp.is_recurring || exp.billing_cycle === 'one_time') {
        // One-time: only in the month of start_date
        if (year === startYear && month === startMonth) {
          total += Number(exp.amount);
        }
      }
    }
    return Math.round(total * 100) / 100;
  }

  // Calculate revenue per month
  function getRevenueForMonth(monthKey: string): number {
    let total = 0;
    for (const rev of revenueEntries) {
      const revDate = new Date(rev.revenue_date);
      const revYear = revDate.getFullYear();
      const revMonth = revDate.getMonth() + 1;
      const revKey = `${revYear}-${String(revMonth).padStart(2, '0')}`;
      if (revKey === monthKey) {
        total += Number(rev.amount);
      }
    }
    return Math.round(total * 100) / 100;
  }

  const months = monthKeys.map((mk) => {
    const expenseTotal = getExpenseForMonth(mk);
    const revenueTotal = getRevenueForMonth(mk);
    return {
      month: mk,
      expenses: expenseTotal,
      revenue: revenueTotal,
      net: Math.round((revenueTotal - expenseTotal) * 100) / 100,
    };
  });

  // Current month MRR (monthly recurring costs)
  const currentMonthKey = monthKeys[monthKeys.length - 1];
  let currentMRR = 0;
  for (const exp of expenses) {
    if (!exp.is_recurring) continue;

    const startDate = new Date(exp.start_date);
    const startKey = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
    if (currentMonthKey < startKey) continue;

    if (exp.end_date) {
      const endDate = new Date(exp.end_date);
      const endKey = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}`;
      if (currentMonthKey > endKey) continue;
    }

    if (exp.billing_cycle === 'monthly') {
      currentMRR += Number(exp.amount);
    } else if (exp.billing_cycle === 'yearly') {
      currentMRR += Number(exp.amount) / 12;
    }
  }
  currentMRR = Math.round(currentMRR * 100) / 100;

  // Category breakdown for current month
  const categoryMap: Record<string, number> = {};
  for (const exp of expenses) {
    const startDate = new Date(exp.start_date);
    const startKey = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
    if (currentMonthKey < startKey) continue;

    if (exp.end_date) {
      const endDate = new Date(exp.end_date);
      const endKey = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}`;
      if (currentMonthKey > endKey) continue;
    }

    let amount = 0;
    if (exp.is_recurring && exp.billing_cycle === 'monthly') {
      amount = Number(exp.amount);
    } else if (exp.is_recurring && exp.billing_cycle === 'yearly') {
      amount = Number(exp.amount) / 12;
    } else if (!exp.is_recurring || exp.billing_cycle === 'one_time') {
      const startYear = startDate.getFullYear();
      const startMonth = startDate.getMonth() + 1;
      const [cy, cm] = currentMonthKey.split('-').map(Number);
      if (cy === startYear && cm === startMonth) {
        amount = Number(exp.amount);
      }
    }

    if (amount > 0) {
      const cat = exp.category || 'other';
      categoryMap[cat] = (categoryMap[cat] || 0) + amount;
    }
  }

  const categoryBreakdown = Object.entries(categoryMap)
    .map(([category, amount]) => ({
      category,
      amount: Math.round(amount * 100) / 100,
    }))
    .sort((a, b) => b.amount - a.amount);

  return NextResponse.json({
    months,
    currentMRR,
    categoryBreakdown,
  });
}
