// src/app/admin/payouts/page.tsx
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import { getToken, getUser } from '@/lib/auth';

type Vendor = {
  id: number;
  business_name: string;
  email: string;
  phone: string;
  county: string | null;
  city: string | null;
  verification_status: string;
  total_gross: string;
  total_commission: string;
  total_net: string;
  total_paid: string;
  amount_owed: string;
  last_paid_at: string | null;
};

type Summary = {
  vendor_count: number;
  total_owed: string;
  total_paid_all_time: string;
};

export default function AdminPayoutsPage() {
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<number | null>(null);

  async function load() {
    const token = getToken();
    const me = getUser();
    if (!token || !me) { router.push('/login'); return; }
    if (me.role !== 'admin') { router.push('/'); return; }

    setLoading(true);
    try {
      const data = await apiGet<{ count: number; summary: Summary; vendors: Vendor[] }>(
        '/admin/payouts',
        token
      );
      setVendors(data.vendors);
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payouts');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handlePay(v: Vendor) {
    const owed = Number(v.amount_owed);
    if (owed <= 0) {
      alert('Nothing owed to this vendor right now.');
      return;
    }

    const amountStr = window.prompt(
      `Pay ${v.business_name}\n\nAmount owed: $${owed.toFixed(2)}\n\nHow much are you paying now?`,
      owed.toFixed(2)
    );
    if (!amountStr) return;

    const amount = Number(amountStr);
    if (isNaN(amount) || amount <= 0) {
      alert('Invalid amount');
      return;
    }
    if (amount > owed) {
      const ok = window.confirm(
        `You're paying $${amount.toFixed(2)} but they are only owed $${owed.toFixed(2)}.\n\nContinue anyway?`
      );
      if (!ok) return;
    }

    const method = window.prompt(
      'Payment method? Type: orange_money, mtn_momo, bank_transfer, cash, other',
      'orange_money'
    );
    if (!method) return;

    const reference = window.prompt('Transaction ID / reference (optional)') || undefined;
    const note = window.prompt('Note (optional — e.g. "Week of Oct 1-7")') || undefined;

    setActingId(v.id);
    try {
      const token = getToken() || undefined;
      await apiPost(
        `/admin/payouts/${v.id}/pay`,
        { amount, method, reference, note },
        token
      );
      alert(`✓ Recorded payout of $${amount.toFixed(2)} to ${v.business_name}`);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to record payout');
    } finally {
      setActingId(null);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <p className="text-gray-500">Loading payouts…</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
            {error}
          </div>
          <Link href="/admin" className="mt-4 inline-block text-emerald-700 hover:underline">
            ← Back to admin
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <Link href="/admin" className="text-sm text-emerald-700 hover:underline">
          ← Back to admin panel
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-gray-900">Vendor Payouts</h1>
        <p className="mt-1 text-gray-600">
          What you owe each vendor and the money you&apos;ve already sent them
        </p>

        {summary && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-sm p-5">
              <p className="text-sm text-gray-500">Vendors</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {summary.vendor_count}
              </p>
              <p className="text-xs text-gray-400 mt-1">active sellers</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-5">
              <p className="text-sm text-gray-500">Total Owed (USD)</p>
              <p className="mt-2 text-3xl font-bold text-amber-600">
                ${Number(summary.total_owed).toFixed(2)}
              </p>
              <p className="text-xs text-gray-400 mt-1">to be paid out</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-5">
              <p className="text-sm text-gray-500">Total Paid (USD)</p>
              <p className="mt-2 text-3xl font-bold text-emerald-700">
                ${Number(summary.total_paid_all_time).toFixed(2)}
              </p>
              <p className="text-xs text-gray-400 mt-1">all-time</p>
            </div>
          </div>
        )}

        <div className="mt-8">
          {vendors.length === 0 ? (
            <p className="text-gray-500">No approved vendors yet.</p>
          ) : (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3">Vendor</th>
                    <th className="px-4 py-3">Sales</th>
                    <th className="px-4 py-3">Commission</th>
                    <th className="px-4 py-3">Net Earned</th>
                    <th className="px-4 py-3">Already Paid</th>
                    <th className="px-4 py-3">Owed</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.map((v) => {
                    const owed = Number(v.amount_owed);
                    return (
                      <tr key={v.id} className="border-t border-gray-100">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{v.business_name}</div>
                          <div className="text-xs text-gray-500">{v.email}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          ${Number(v.total_gross).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          −${Number(v.total_commission).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          ${Number(v.total_net).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-emerald-700">
                          ${Number(v.total_paid).toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`font-semibold ${
                              owed > 0 ? 'text-amber-600' : 'text-gray-400'
                            }`}
                          >
                            ${owed.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handlePay(v)}
                            disabled={actingId === v.id || owed <= 0}
                            className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-sm font-medium hover:bg-emerald-800 disabled:bg-gray-300 disabled:cursor-not-allowed"
                          >
                            {actingId === v.id ? 'Saving…' : 'Pay'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}