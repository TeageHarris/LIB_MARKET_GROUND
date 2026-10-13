'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getUser, logout, type AuthUser } from '@/lib/auth';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setMounted(true);
    setUser(getUser());
  }, [pathname]);

  function handleLogout() {
    logout();
    setUser(null);
    router.push('/');
  }

  const isAdmin = user?.role === 'admin';
  const isVendor = user?.role === 'vendor_owner' || isAdmin;

  return (
    <header className="bg-emerald-700 text-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-6">

        <Link
          href="/"
          className="text-xl font-bold tracking-tight hover:opacity-90 whitespace-nowrap"
        >
          LIB_MARKET_GROUND
        </Link>

        <nav className="flex items-center gap-5 text-sm">
          <Link href="/products" className="hover:underline">Products</Link>

          {mounted && !user && (
            <>
              <Link href="/vendor-guide" className="hover:underline">
                Sell here
              </Link>
              <Link
                href="/login"
                className={`px-4 py-1.5 rounded-full font-medium transition-colors ${
                  pathname === '/login'
                    ? 'bg-white text-emerald-700 hover:bg-emerald-50'
                    : 'hover:opacity-90'
                }`}
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className={`px-4 py-1.5 rounded-full font-medium transition-colors ${
                  pathname === '/register'
                    ? 'bg-white text-emerald-700 hover:bg-emerald-50'
                    : 'hover:opacity-90'
                }`}
              >
                Sign up
              </Link>
            </>
          )}

          {mounted && user && (
            <>
              <Link href="/cart" className="hover:underline">Cart</Link>
              <Link href="/orders" className="hover:underline">Orders</Link>

              {isVendor && (
                <Link
                  href="/vendor"
                  className={`hover:underline ${
                    pathname.startsWith('/vendor') ? 'font-semibold underline' : ''
                  }`}
                >
                  Vendor
                </Link>
              )}

              {isAdmin && (
                <Link
                  href="/admin"
                  className={`hover:underline ${
                    pathname.startsWith('/admin') ? 'font-semibold underline' : ''
                  }`}
                >
                  Admin
                </Link>
              )}

              <Link
                href="/account"
                className={`hover:underline ${
                  pathname === '/account' ? 'font-semibold underline' : ''
                }`}
              >
                Hi, {user.full_name || user.email}
              </Link>

              <button onClick={handleLogout} className="hover:underline">
                Logout
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}