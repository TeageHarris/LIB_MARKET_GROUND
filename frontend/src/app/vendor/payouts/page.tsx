// src/app/vendor/payouts/page.tsx
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { getToken, getUser } from '@/lib/auth';

type Payout = {
  id: number;
  amount: string;
  period_start: string | null;
  period_end: string | null;
  method: string;
  reference: string | null;
  note: string | null;
  paid_at: string;
};

type Summary = {
  total_gross: string;
  total_commission: string;
  total_net: string;

  delivered_gross: string;
  delivered_commission: string;
  delivered_net: string;

  pending_gross: string;
  pending_commission: string;
  pending_net: string;

  delivered_count: number;
  pending_count: number;

  total_paid: string;
  last_paid_at: string | null;

  payable_now: string;
  amount_owed: string;
};

type VendorInfo = {
  id: number;
  business_name: string;
};

export default function VendorPayoutsPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [vendor, setVendor] = useState<VendorInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    const me = getUser();
    if (!token || !me) { router.push('/login'); return; }

    (async () => {
      try {
        const data = await apiGet<{
          vendor: VendorInfo;
          summary: Summary;
          count: number;
          payouts: Payout[];
        }>('/vendors/me/payouts', token);
        setVendor(data.vendor);
        setSummary(data.summary);
        setPayouts(data.payouts);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load payouts');
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <p className="text-gray-500">Loading your payouts…</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
            {error}
          </div>
          <Link href="/vendor" className="mt-4 inline-block text-emerald-700 hover:underline">
            ← Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <Link href="/vendor" className="text-sm text-emerald-700 hover:underline">
          ← Back to dashboard
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-gray-900">Your Payouts</h1>
        <p className="mt-1 text-gray-600">
          Your earnings broken down by order stage
          {vendor && <> — <span className="font-medium text-emerald-700">{vendor.business_name}</span></>}
        </p>

        {summary && (
          <>
            {/* Confirmed vs in-progress summary row */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-emerald-500">
                <p className="text-sm text-gray-500">Confirmed earnings</p>
                <p className="mt-2 text-3xl font-bold text-emerald-700">
                  ${Number(summary.delivered_net).toFixed(2)}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  from {summary.delivered_count} delivered order{summary.delivered_count === 1 ? '' : 's'}
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-blue-500">
                <p className="text-sm text-gray-500">In progress</p>
                <p className="mt-2 text-3xl font-bold text-blue-700">
                  ${Number(summary.pending_net).toFixed(2)}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  from {summary.pending_count} paid or shipped order{summary.pending_count === 1 ? '' : 's'}
                </p>
              </div>
            </div>

            {/* Payout status row */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl shadow-sm p-5">
                <p className="text-sm text-gray-500">Already received</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  ${Number(summary.total_paid).toFixed(2)}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {summary.last_paid_at
                    ? `last payout: ${new Date(summary.last_paid_at).toLocaleDateString()}`
                    : 'no payouts yet'}
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-5">
                <p className="text-sm text-gray-500">Available for payout</p>
                <p className="mt-2 text-3xl font-bold text-amber-600">
                  ${Number(summary.payable_now).toFixed(2)}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  paid out every Friday
                </p>
              </div>
            </div>

            {/* Breakdown table */}
            <section className="mt-8">
              <h2 className="text-lg font-semibold text-gray-900">Earnings breakdown</h2>
              <div className="mt-3 bg-white rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    <tr>
                      <th className="px-4 py-3">Stage</th>
                      <th className="px-4 py-3 text-right">Gross</th>
                      <th className="px-4 py-3 text-right">Commission</th>
                      <th className="px-4 py-3 text-right">Your net</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-gray-100">
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900">Delivered</span>
                        <span className="text-xs text-emerald-700 ml-2">✓ confirmed</span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">
                        ${Number(summary.delivered_gross).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500">
                        −${Number(summary.delivered_commission).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                        ${Number(summary.delivered_net).toFixed(2)}
                      </td>
                    </tr>
                    <tr className="border-t border-gray-100">
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900">In progress</span>
                        <span className="text-xs text-gray-500 ml-2">paid or shipped</span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">
                        ${Number(summary.pending_gross).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500">
                        −${Number(summary.pending_commission).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-blue-700">
                        ${Number(summary.pending_net).toFixed(2)}
                      </td>
                    </tr>
                    <tr className="border-t-2 border-gray-200 bg-gray-50">
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        Total
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        ${Number(summary.total_gross).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        −${Number(summary.total_commission).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">
                        ${Number(summary.total_net).toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-gray-500">
                Only <strong>delivered</strong> orders are paid out. In-progress orders
                remain pending until the buyer confirms delivery.
              </p>
            </section>
          </>
        )}

        {/* Payout history */}
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-gray-900">Payout history</h2>
          {payouts.length === 0 ? (
            <div className="mt-3 bg-white rounded-xl shadow-sm p-6 text-center text-gray-500 text-sm">
              No payouts yet. We pay out every Friday via Orange Money or MoMo.
            </div>
          ) : (
            <div className="mt-3 bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3">Reference</th>
                    <th className="px-4 py-3">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((p) => (
                    <tr key={p.id} className="border-t border-gray-100">
                      <td className="px-4 py-3 text-gray-700">
                        {new Date(p.paid_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 font-semibold text-emerald-700">
                        ${Number(p.amount).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-xs uppercase text-gray-600">
                        {p.method.replace('_', ' ')}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-600">
                        {p.reference || '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {p.note || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="mt-8 bg-blue-50 border border-blue-200 text-blue-800 text-sm p-4 rounded-lg">
          <strong>How payouts work:</strong> Buyers pay the platform, we verify
          and mark the order paid, you ship, buyer confirms delivery. Once
          delivered, the earnings become <strong>confirmed</strong> and get paid
          out the following Friday (minus our 10% commission).
        </div>
      </div>
    </main>
  );
}