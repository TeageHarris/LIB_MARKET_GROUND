// src/app/vendor/settings/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet, apiPatch } from '@/lib/api';
import { getToken, getUser } from '@/lib/auth';

type Vendor = {
  id: number;
  business_name: string;
  default_shipping_usd: string;
};

export default function VendorSettingsPage() {
  const router = useRouter();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [fee, setFee] = useState<string>('');

  useEffect(() => {
    const token = getToken();
    const me = getUser();
    if (!token) { router.push('/login'); return; }
    if (!me || (me.role !== 'vendor_owner' && me.role !== 'admin')) {
      router.push('/');
      return;
    }
    (async () => {
      try {
        const data = await apiGet<{ vendor: Vendor }>('/vendors/me', token);
        setVendor(data.vendor);
        setFee(Number(data.vendor.default_shipping_usd).toFixed(2));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load vendor');
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const n = parseFloat(fee);
    if (isNaN(n) || n < 0) {
      setError('Shipping fee must be a number >= 0');
      return;
    }

    const token = getToken();
    if (!token) { router.push('/login'); return; }

    setSaving(true);
    try {
      const res = await apiPatch<{ message: string; vendor: Vendor }>(
        '/vendors/me',
        { default_shipping_usd: n },
        token
      );
      setVendor(res.vendor);
      setFee(Number(res.vendor.default_shipping_usd).toFixed(2));
      setSuccess('Saved. New default will apply to all your products without an override.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 py-12">
          <p className="text-gray-500">Loading settings…</p>
        </div>
      </main>
    );
  }

  if (!vendor) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 py-12">
          <p className="text-red-600">{error || 'Vendor not found'}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <Link href="/vendor" className="text-sm text-gray-500 hover:text-gray-900">
          ← Back to dashboard
        </Link>

        <div className="mt-4">
          <h1 className="text-3xl font-bold text-gray-900">Vendor Settings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage defaults for {vendor.business_name}
          </p>
        </div>

        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mt-6 bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-lg text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
            Shipping
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Default shipping fee (USD)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              className="w-full max-w-xs px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
            <p className="mt-2 text-xs text-gray-500 leading-relaxed">
              This is the shipping fee buyers pay the courier on delivery when
              a product doesn&apos;t have its own override. You can override
              this per-product when adding or editing a product.
            </p>
          </div>

          <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-800">
            <strong>How shipping works:</strong> buyers pay the product price to
            the platform online. Shipping is paid separately, in cash, to the
            courier on delivery. The full shipping fee goes to you — no
            commission is taken on it.
          </div>

          <div className="mt-6">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 rounded-lg bg-emerald-700 text-white font-semibold hover:bg-emerald-800 disabled:bg-gray-400 transition-colors"
            >
              {saving ? 'Saving…' : 'Save settings'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}