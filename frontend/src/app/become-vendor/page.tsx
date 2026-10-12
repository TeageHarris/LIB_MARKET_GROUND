// src/app/become-vendor/page.tsx
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiPost } from '@/lib/api';
import { getUser, getToken, AuthUser } from '@/lib/auth';

const COUNTIES = [
  'Bomi', 'Bong', 'Gbarpolu', 'Grand Bassa', 'Grand Cape Mount',
  'Grand Gedeh', 'Grand Kru', 'Lofa', 'Margibi', 'Maryland',
  'Montserrado', 'Nimba', 'River Cess', 'River Gee', 'Sinoe',
];

export default function BecomeVendorPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [mounted, setMounted] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [businessName, setBusinessName] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [county, setCounty] = useState('Montserrado');
  const [city, setCity] = useState('Monrovia');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const u = getUser();
    setUser(u);
    setMounted(true);

    // Not logged in → bounce to login, come back here after
    if (!u) {
      router.replace('/login?next=/become-vendor');
      return;
    }

    if (u) {
      setPhone(u.phone || '');
      setEmail(u.email || '');
    }
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const token = getToken() || undefined;
      await apiPost(
        '/vendors/apply',
        {
          business_name: businessName,
          description,
          phone,
          email,
          county,
          city,
        },
        token
      );
      setSubmitted(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to submit application';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (!mounted) return null;

  // While redirecting guest to login
  if (!user) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Redirecting to sign in…</p>
      </main>
    );
  }

  // Already a vendor or admin
  if (user.role !== 'buyer') {
    return (
      <main className="max-w-xl mx-auto px-4 py-16">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            You&apos;re already set up
          </h1>
          <p className="mt-2 text-gray-600">
            Your account role is <strong>{user.role}</strong>. You don&apos;t need to apply again.
          </p>
          <Link
            href={user.role === 'admin' ? '/admin' : '/vendor'}
            className="mt-6 inline-block px-6 py-3 rounded-lg bg-emerald-700 text-white font-semibold hover:bg-emerald-800"
          >
            Go to dashboard
          </Link>
        </div>
      </main>
    );
  }

  // Just submitted — success screen
  if (submitted) {
    return (
      <main className="max-w-xl mx-auto px-4 py-16">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="text-5xl mb-4">✓</div>
          <h1 className="text-2xl font-bold text-gray-900">
            Application submitted
          </h1>
          <p className="mt-2 text-gray-600">
            Your vendor application for <strong>{businessName}</strong> is pending admin review.
            You&apos;ll be notified once it&apos;s approved.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block px-6 py-3 rounded-lg bg-emerald-700 text-white font-semibold hover:bg-emerald-800"
          >
            Back to products
          </Link>
        </div>
      </main>
    );
  }

  // The form
  return (
    <main className="max-w-xl mx-auto px-4 py-12">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-3xl font-bold text-gray-900">Become a Vendor</h1>
        <p className="mt-2 text-gray-600">
          Sell your products on LIB_MARKET_GROUND. Fill in the details below.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Business name *
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              placeholder="e.g. Fresh Crafts"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              placeholder="What do you sell?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone *
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                County
              </label>
              <select
                value={county}
                onChange={(e) => setCounty(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              >
                {COUNTIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-emerald-700 text-white font-semibold hover:bg-emerald-800 disabled:bg-gray-400 transition-colors"
          >
            {loading ? 'Submitting...' : 'Submit application'}
          </button>
        </form>
      </div>
    </main>
  );
}