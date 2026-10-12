// src/app/admin/vendors/page.tsx
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import { getToken, getUser } from '@/lib/auth';

type Vendor = {
  id: number;
  owner_user_id: number;
  business_name: string;
  slug: string;
  description: string | null;
  phone: string;
  email: string;
  county: string | null;
  city: string | null;
  verification_status: 'pending' | 'approved' | 'rejected' | 'suspended';
  created_at: string;
};

// 🔧 Update these to match your live URLs + contact info
const VENDOR_GUIDE_URL = 'http://localhost:4000/vendor-guide';
const SUPPORT_PHONE = '+231 88 067 6703';

export default function AdminVendorsPage() {
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<number | null>(null);

  async function loadVendors() {
    const token = getToken();
    const me = getUser();
    if (!token || !me) { router.push('/login'); return; }
    if (me.role !== 'admin') { router.push('/'); return; }

    try {
      const data = await apiGet<{ count: number; vendors: Vendor[] }>(
        '/admin/vendors',
        token
      );
      setVendors(data.vendors);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load vendors');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadVendors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleApprove(id: number) {
    setActingId(id);
    try {
      const token = getToken() || undefined;
      await apiPost(`/admin/vendors/${id}/approve`, {}, token);
      await loadVendors();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Approve failed');
    } finally {
      setActingId(null);
    }
  }

  async function handleReject(id: number) {
    const reason = window.prompt('Reason for rejection? (required)');
    if (!reason) return;
    setActingId(id);
    try {
      const token = getToken() || undefined;
      await apiPost(`/admin/vendors/${id}/reject`, { reason }, token);
      await loadVendors();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Reject failed');
    } finally {
      setActingId(null);
    }
  }

  async function handleSuspend(id: number, businessName: string) {
    const confirmed = window.confirm(
      `Suspend "${businessName}"?\n\nThis will:\n- Hide all their products\n- Remove their vendor access\n\nThey can be reinstated later.`
    );
    if (!confirmed) return;
    const reason = window.prompt(
      'Reason for suspension? (optional — for your records)'
    );
    setActingId(id);
    try {
      const token = getToken() || undefined;
      await apiPost(`/admin/vendors/${id}/suspend`, { reason }, token);
      await loadVendors();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Suspend failed');
    } finally {
      setActingId(null);
    }
  }

  async function handleReinstate(id: number, businessName: string) {
    const confirmed = window.confirm(
      `Reinstate "${businessName}"?\n\nThis will:\n- Republish their products\n- Restore their vendor access`
    );
    if (!confirmed) return;
    setActingId(id);
    try {
      const token = getToken() || undefined;
      await apiPost(`/admin/vendors/${id}/reinstate`, {}, token);
      await loadVendors();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Reinstate failed');
    } finally {
      setActingId(null);
    }
  }

  function handleSendWelcome(v: Vendor) {
    const choice = window.prompt(
      `Send welcome to ${v.business_name}?\n\nType:\n  1 → WhatsApp (${v.phone})\n  2 → Email (${v.email})`,
      '1'
    );
    if (!choice) return;

    const message = buildWelcomeMessage(v);
    const subject = `Welcome to LIB_MARKET_GROUND — ${v.business_name} approved!`;

    if (choice === '1') {
      // wa.me requires digits only (no +, spaces, dashes)
      const cleanPhone = v.phone.replace(/[^0-9]/g, '');
      const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
    } else if (choice === '2') {
      const url = `mailto:${v.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 py-12">
          <p className="text-gray-500">Loading vendors…</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 py-12">
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

  const pending = vendors.filter((v) => v.verification_status === 'pending');
  const approved = vendors.filter((v) => v.verification_status === 'approved');
  const suspended = vendors.filter(
    (v) => v.verification_status === 'suspended' || v.verification_status === 'rejected'
  );

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <Link href="/admin" className="text-sm text-emerald-700 hover:underline">
          ← Back to admin panel
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-gray-900">Vendor Applications</h1>
        <p className="mt-1 text-gray-600">
          Approve, suspend, or reinstate vendors, and send welcome messages
        </p>

        {/* Pending */}
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900">
            Pending ({pending.length})
          </h2>
          {pending.length === 0 ? (
            <p className="mt-2 text-gray-500 text-sm">No pending applications.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {pending.map((v) => (
                <div
                  key={v.id}
                  className="bg-white rounded-xl shadow-sm p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                >
                  <div>
                    <h3 className="font-semibold text-gray-900">{v.business_name}</h3>
                    <p className="text-sm text-gray-500">
                      {v.email} · {v.phone}
                    </p>
                    {(v.county || v.city) && (
                      <p className="text-sm text-gray-500">
                        {v.city}
                        {v.city && v.county ? ', ' : ''}
                        {v.county}
                      </p>
                    )}
                    {v.description && (
                      <p className="text-sm text-gray-600 mt-2">{v.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleApprove(v.id)}
                      disabled={actingId === v.id}
                      className="px-4 py-2 rounded-lg bg-emerald-700 text-white font-medium hover:bg-emerald-800 disabled:bg-gray-400"
                    >
                      {actingId === v.id ? 'Approving…' : 'Approve'}
                    </button>
                    <button
                      onClick={() => handleReject(v.id)}
                      disabled={actingId === v.id}
                      className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 disabled:bg-gray-400"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Approved */}
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-gray-900">
            Approved ({approved.length})
          </h2>
          {approved.length === 0 ? (
            <p className="mt-2 text-gray-500 text-sm">No approved vendors yet.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {approved.map((v) => (
                <div
                  key={v.id}
                  className="bg-white rounded-lg shadow-sm p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div>
                    <p className="font-medium text-gray-900">{v.business_name}</p>
                    <p className="text-sm text-gray-500">
                      {v.email} · {v.phone}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
                      Approved
                    </span>
                    <button
                      onClick={() => handleSendWelcome(v)}
                      className="px-3 py-1.5 rounded-lg bg-blue-100 text-blue-800 text-sm font-medium hover:bg-blue-200"
                      title="Send welcome message with vendor guide link"
                    >
                      📤 Send Welcome
                    </button>
                    <button
                      onClick={() => handleSuspend(v.id, v.business_name)}
                      disabled={actingId === v.id}
                      className="px-3 py-1.5 rounded-lg bg-amber-100 text-amber-800 text-sm font-medium hover:bg-amber-200 disabled:opacity-50"
                    >
                      {actingId === v.id ? 'Suspending…' : 'Suspend'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Suspended / Rejected */}
        {suspended.length > 0 && (
          <section className="mt-10">
            <h2 className="text-lg font-semibold text-gray-900">
              Suspended / Rejected ({suspended.length})
            </h2>
            <div className="mt-3 space-y-2">
              {suspended.map((v) => (
                <div
                  key={v.id}
                  className="bg-white rounded-lg shadow-sm p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div>
                    <p className="font-medium text-gray-900">{v.business_name}</p>
                    <p className="text-sm text-gray-500">{v.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-medium px-3 py-1 rounded-full ${
                        v.verification_status === 'suspended'
                          ? 'text-amber-700 bg-amber-50'
                          : 'text-red-700 bg-red-50'
                      }`}
                    >
                      {v.verification_status}
                    </span>
                    {v.verification_status === 'suspended' && (
                      <button
                        onClick={() => handleReinstate(v.id, v.business_name)}
                        disabled={actingId === v.id}
                        className="px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 text-sm font-medium hover:bg-emerald-200 disabled:opacity-50"
                      >
                        {actingId === v.id ? 'Reinstating…' : 'Reinstate'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

// ---------- Welcome message template ----------

function buildWelcomeMessage(v: Vendor): string {
  return `🎉 Welcome to LIB_MARKET_GROUND, ${v.business_name}!

Your vendor application has been approved. You can now start selling.

📋 READ THE VENDOR GUIDE
${VENDOR_GUIDE_URL}

It covers:
• How buyers pay (they pay us, not you)
• Our 10% commission
• Weekly payouts every Friday
• How to manage products and orders

🚀 START SELLING
1. Log in: http://localhost:4000/login
2. Add your first product: http://localhost:4000/vendor/products/new
3. Upload good photos
4. Publish

💡 TIP: The more products you list with good photos, the more you sell.

❓ Questions? WhatsApp us: ${SUPPORT_PHONE}

— The LIB_MARKET_GROUND Team`;
}