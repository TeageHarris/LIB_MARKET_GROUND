// src/app/layout.tsx
import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "LIB_MARKET_GROUND — Liberian businesses, worldwide buyers",
  description: "Multi-vendor marketplace for Liberian businesses",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-50 flex flex-col min-h-screen">
        <Header />
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}

function Footer() {
  return (
    <footer className="mt-auto border-t border-gray-200 bg-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row gap-6 sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-700 uppercase tracking-wide">
              LIB_MARKET_GROUND
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Liberian businesses, worldwide buyers
            </p>
          </div>

          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <Link
              href="/buyer-guide"
              className="text-gray-600 hover:text-emerald-700 transition-colors"
            >
              Buyer Guide
            </Link>
            <Link
              href="/vendor-guide"
              className="text-gray-600 hover:text-emerald-700 transition-colors"
            >
              Vendor Guide
            </Link>
            <Link
              href="/admin-guide"
              className="text-gray-600 hover:text-emerald-700 transition-colors"
            >
              Admin Guide
            </Link>
            <Link
              href="/become-vendor"
              className="text-gray-600 hover:text-emerald-700 transition-colors"
            >
              Become a Vendor
            </Link>
          </nav>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-100 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between text-xs text-gray-400">
          <p>© {new Date().getFullYear()} LIB_MARKET_GROUND. All rights reserved.</p>
          <p>libmarketgroundsupport@gmail.com · +231 88 067 6703</p>
        </div>
      </div>
    </footer>
  );
}