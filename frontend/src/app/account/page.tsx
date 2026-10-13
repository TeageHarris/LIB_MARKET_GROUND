// src/app/account/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet, apiPatch } from '@/lib/api';
import { getToken, getUser, AuthUser } from '@/lib/auth';

export default function AccountPage() {
  const router = useRouter();
  const [user, setLocalUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile form
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [profileErr, setProfileErr] = useState<string | null>(null);

  // Password form
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwErr, setPwErr] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }
    // Start with cached user for instant render
    const cached = getUser();
    if (cached) {
      setLocalUser(cached);
      setFullName(cached.full_name);
      setPhone(cached.phone);
    }
    // Refresh from server
    apiGet<{ user: AuthUser }>('/auth/me', token)
      .then((data) => {
        setLocalUser(data.user);
        setFullName(data.user.full_name);
        setPhone(data.user.phone);
      })
      .catch((err) => {
        setProfileErr(err instanceof Error ? err.message : 'Failed to load profile');
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    setProfileMsg(null);
    setProfileErr(null);
    try {
      const token = getToken();
      if (!token) throw new Error('Not logged in');
      const data = await apiPatch<{ message: string; user: AuthUser }>(
        '/auth/me',
        { full_name: fullName, phone },
        token
      );
      setLocalUser(data.user);
      setProfileMsg(data.message || 'Profile updated');
      setTimeout(() => setProfileMsg(null), 3000);
    } catch (err) {
      setProfileErr(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    setPwErr(null);

    if (newPw !== confirmPw) {
      setPwErr('New passwords do not match');
      return;
    }
    if (newPw.length < 8) {
      setPwErr('New password must be at least 8 characters');
      return;
    }

    setSavingPw(true);
    try {
      const token = getToken();
      if (!token) throw new Error('Not logged in');
      const data = await apiPatch<{ message: string }>(
        '/auth/me/password',
        { current_password: currentPw, new_password: newPw },
        token
      );
      setPwMsg(data.message || 'Password changed');
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      setTimeout(() => setPwMsg(null), 4000);
    } catch (err) {
      setPwErr(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setSavingPw(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-12">
          <p className="text-gray-500">Loading account…</p>
        </div>
      </main>
    );
  }

  if (!user) return null;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-900">My Account</h1>
        <p className="text-sm text-gray-500 mt-1">
          {user.email} · {user.role.replace('_', ' ')}
        </p>

        {/* Profile */}
        <section className="mt-8 bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900">Profile</h2>
          <p className="text-sm text-gray-500 mt-1">
            Update your name and phone number.
          </p>

          {profileErr && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
              {profileErr}
            </div>
          )}
          {profileMsg && (
            <div className="mt-4 bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-lg text-sm">
              {profileMsg}
            </div>
          )}

          <form onSubmit={saveProfile} className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={user.email}
                disabled
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Email can&apos;t be changed. Contact support if you need to.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="px-5 py-2 rounded-lg bg-emerald-700 text-white font-semibold hover:bg-emerald-800 disabled:bg-gray-400 transition-colors"
            >
              {savingProfile ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        </section>

        {/* Password */}
        <section className="mt-6 bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900">Change password</h2>
          <p className="text-sm text-gray-500 mt-1">
            Choose a strong password at least 8 characters long.
          </p>

          {pwErr && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
              {pwErr}
            </div>
          )}
          {pwMsg && (
            <div className="mt-4 bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-lg text-sm">
              {pwMsg}
            </div>
          )}

          <form onSubmit={changePassword} className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current password
              </label>
              <input
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New password
              </label>
              <input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm new password
              </label>
              <input
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={savingPw}
              className="px-5 py-2 rounded-lg bg-emerald-700 text-white font-semibold hover:bg-emerald-800 disabled:bg-gray-400 transition-colors"
            >
              {savingPw ? 'Changing…' : 'Change password'}
            </button>
          </form>
        </section>

        <p className="mt-8 text-center text-sm text-gray-500">
          <Link href="/" className="text-emerald-700 hover:underline">
            ← Back to home
          </Link>
        </p>
      </div>
    </main>
  );
}