// src/components/Header.tsx
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getUser, logout, AuthUser } from '@/lib/auth';

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setUser(getUser());
    setMounted(true);
  }, [pathname]);

  function handleLogout() {
    logout();
    setUser(null);
    router.push('/');
    router.refresh();
  }

  const isVendor = user && (user.role === 'vendor_owner' || user.role === 'admin');
  const isAdmin = user && user.role === 'admin';
  const isBuyer = user && user.role === 'buyer';

  return (
    <header className="bg-emerald-700 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold tracking-tight hover:opacity-90">
          LIB_MARKET_GROUND
        </Link>

        <nav className="flex items-center gap-4 text-sm flex-wrap">
          <Link href="/" className="hover:opacity-90">
            Products
          </Link>

          {mounted && user && (
            <Link href="/cart" className="hover:opacity-90">
              Cart
            </Link>
          )}

          {mounted && user && (
            <Link href="/orders" className="hover:opacity-90">
              Orders
            </Link>
          )}

          {mounted && isAdmin && (
            <Link href="/admin" className="hover:opacity-90 font-medium">
              Admin
            </Link>
          )}

          {mounted && isVendor && (
            <Link href="/vendor" className="hover:opacity-90 font-medium">
              Vendor
            </Link>
          )}

          {/* Become a Vendor — only for logged-in buyers */}
          {mounted && isBuyer && (
            <Link href="/become-vendor" className="hover:opacity-90">
              Become a Vendor
            </Link>
          )}

          {/* Sell on LIB_MARKET_GROUND — for guests (not logged in) */}
          {mounted && !user && (
            <Link
              href="/vendor-guide"
              className="hover:opacity-90 font-medium underline decoration-1 underline-offset-2"
            >
              Sell Here
            </Link>
          )}

          {mounted && !user && (
            <>
              <Link href="/login" className="hover:opacity-90">
                Sign in
              </Link>
              <Link
                href="/register"
                className="bg-white text-emerald-700 px-4 py-1.5 rounded-full font-medium hover:bg-emerald-50"
              >
                Sign up
              </Link>
            </>
          )}

          {mounted && user && (
            <>
              <span className="opacity-90 hidden sm:inline">
                Hi, {user.full_name.split(' ')[0]}
              </span>
              <button
                onClick={handleLogout}
                className="hover:opacity-90 underline"
              >
                Logout
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}