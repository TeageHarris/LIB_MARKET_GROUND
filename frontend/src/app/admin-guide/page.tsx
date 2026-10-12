// src/app/admin-guide/page.tsx
import Link from 'next/link';

export const metadata = {
  title: 'Admin Guide — LIB_MARKET_GROUND',
  description:
    'How to run LIB_MARKET_GROUND — vendors, orders, payouts, refunds, and daily ops',
};

const SUPPORT_EMAIL = 'libmarketgroundsupport@gmail.com';
const SUPPORT_PHONE = '+231 88 067 6703';
const WHATSAPP_NUMBER = '+231 88 067 6703';
export default function AdminGuidePage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link href="/admin" className="text-sm text-emerald-700 hover:underline">
          ← Back to admin panel
        </Link>

        <header className="mt-6">
          <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
            For Admins
          </p>
          <h1 className="mt-2 text-4xl font-bold text-gray-900">Admin Guide</h1>
          <p className="mt-3 text-gray-600 leading-relaxed">
            The operating manual for LIB_MARKET_GROUND. Everything you need to
            approve vendors, verify payments, run weekly payouts, and handle
            refunds or problems — end to end.
          </p>
        </header>

        {/* 1. Your admin panel */}
        <Section number="1" title="Your Admin Panel">
          <p>
            Everything lives under{' '}
            <Link href="/admin" className="text-emerald-700 underline">
              /admin
            </Link>
            . You need the <strong>admin</strong> role to see it. From the
            dashboard you can jump to:
          </p>
          <ul className="mt-3 space-y-2 list-disc pl-5">
            <li>
              <strong>Vendor Applications</strong> — approve, reject, or
              suspend sellers
            </li>
            <li>
              <strong>Platform Orders</strong> — every order, all vendors
            </li>
            <li>
              <strong>Vendor Payouts</strong> — who you owe, what you&apos;ve
              already sent
            </li>
          </ul>
          <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <p className="text-sm font-medium text-emerald-800 mb-1">
              Do not share your admin login
            </p>
            <p className="text-sm text-emerald-700">
              The admin account can move money, suspend vendors, and refund
              orders. Keep it for yourself (and any staff you formally add as
              admins).
            </p>
          </div>
        </Section>

        {/* 2. Approving vendors */}
        <Section number="2" title="Approving Vendors">
          <p>
            When a seller applies, they appear on{' '}
            <Link href="/admin/vendors" className="text-emerald-700 underline">
              /admin/vendors
            </Link>{' '}
            with a <Badge>pending</Badge> badge.
          </p>
          <ol className="mt-3 space-y-3 list-decimal pl-5">
            <li>
              Open the application and review the uploaded documents —
              business registration, national ID, and any tax or MoMo proof.
            </li>
            <li>
              If everything checks out, tap <strong>Approve</strong>. The
              seller becomes a vendor_owner and can list products immediately.
            </li>
            <li>
              If something is wrong, tap <strong>Reject</strong> and enter a
              reason. The seller will see it and can re-apply.
            </li>
          </ol>
          <p className="mt-4 font-medium text-gray-900">
            What to check before approving
          </p>
          <ul className="mt-2 space-y-1 list-disc pl-5">
            <li>Business name matches the registration document</li>
            <li>Phone number on the application is reachable</li>
            <li>
              The products they intend to sell fit the platform — no counterfeit
              goods, no prohibited items
            </li>
          </ul>
        </Section>

        {/* 3. Platform orders */}
        <Section number="3" title="Monitoring Every Order">
          <p>
            <Link href="/admin/orders" className="text-emerald-700 underline">
              /admin/orders
            </Link>{' '}
            shows every order on the platform. Use the status filter to focus
            on one bucket at a time — for example,{' '}
            <Badge>pending_payment</Badge> to see what&apos;s waiting on
            payment, or <Badge>paid</Badge> to see what&apos;s ready to ship.
          </p>
          <p className="mt-3">
            Click any order to open the detail page. From there you can see the
            buyer, vendor, items, totals, and payment records.
          </p>
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm font-medium text-amber-900 mb-1">
              The <strong>Sweep stale orders</strong> button
            </p>
            <p className="text-sm text-amber-800">
              Clicking this auto-cancels any order stuck in{' '}
              <code className="text-xs bg-white px-1.5 py-0.5 rounded font-mono">
                pending_shipping_quote
              </code>{' '}
              or{' '}
              <code className="text-xs bg-white px-1.5 py-0.5 rounded font-mono">
                pending_payment
              </code>{' '}
              for more than 48 hours. Reserved stock is released automatically.
              The same sweep runs in the background every 6 hours — the button
              is just for forcing it.
            </p>
          </div>
        </Section>

        {/* 4. Marking payments as paid */}
        <Section number="4" title="Verifying Payments">
          <p className="font-medium text-gray-900">
            This is the most important daily task.
          </p>
          <p className="mt-2">
            When a buyer sends payment to your Orange Money or MoMo account,
            it&apos;s on you to match it against their order and mark it{' '}
            <Badge>paid</Badge>.
          </p>
          <ol className="mt-3 space-y-3 list-decimal pl-5">
            <li>
              Check your Orange Money / MoMo app for incoming payments. Each
              payment should have an order number (e.g.{' '}
              <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono">
                LMG-261011-0005
              </code>
              ) in the reference.
            </li>
            <li>
              Find that order on{' '}
              <Link href="/admin/orders" className="text-emerald-700 underline">
                /admin/orders
              </Link>{' '}
              and open it.
            </li>
            <li>
              Confirm the amount matches the order total. If it does, tap{' '}
              <strong>✓ Mark as Paid</strong>. Paste the transaction reference
              from your money app when prompted.
            </li>
            <li>
              The order flips to <Badge>paid</Badge>. The vendor sees it in
              their dashboard and ships the product.
            </li>
          </ol>
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm font-medium text-red-800 mb-1">
              Only mark as paid after you see the money
            </p>
            <p className="text-sm text-red-700">
              Marking an order as paid before verifying the payment means the
              vendor might ship a product that was never bought. Always check
              your account first.
            </p>
          </div>
        </Section>

        {/* 5. Payouts */}
        <Section number="5" title="Weekly Vendor Payouts">
          <p>
            Payouts run{' '}
            <strong>every Friday for orders delivered the previous week</strong>
            , via Orange Money or MoMo.
          </p>
          <ol className="mt-3 space-y-3 list-decimal pl-5">
            <li>
              Go to{' '}
              <Link href="/admin/payouts" className="text-emerald-700 underline">
                /admin/payouts
              </Link>
              . Each approved vendor is listed with their sales, commission,
              net earned, and amount owed.
            </li>
            <li>
              The <strong>Total Owed</strong> at the top is what you need to
              send out this week.
            </li>
            <li>
              Send each vendor their owed amount via their preferred account
              (Orange Money or MoMo).
            </li>
            <li>
              Back on the payouts page, click <strong>Pay</strong> next to the
              vendor. Enter the exact amount, the method, the transaction
              reference, and a note (e.g. &quot;Week of Oct 6-12&quot;). Save.
            </li>
            <li>
              The vendor&apos;s <strong>Already Paid</strong> and{' '}
              <strong>Owed</strong> columns update immediately. Owed goes to
              $0.00 once they&apos;re squared up.
            </li>
          </ol>
          <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <p className="text-sm font-medium text-emerald-800 mb-2">
              How the numbers work
            </p>
            <ul className="text-sm text-emerald-700 space-y-1 list-disc pl-5">
              <li>
                <strong>Sales</strong> — sum of delivered order line-totals
              </li>
              <li>
                <strong>Commission</strong> — 10% of sales (platform take)
              </li>
              <li>
                <strong>Net earned</strong> — sales minus commission
              </li>
              <li>
                <strong>Owed</strong> — net earned minus what you&apos;ve
                already paid
              </li>
            </ul>
            <p className="text-xs text-emerald-700 mt-2">
              Only <strong>delivered</strong> orders count. Refunded and
              cancelled orders drop out automatically.
            </p>
          </div>
        </Section>

        {/* 6. Refunds */}
        <Section number="6" title="Handling Refunds">
          <p>
            When a buyer disputes an order, open the order on{' '}
            <Link href="/admin/orders" className="text-emerald-700 underline">
              /admin/orders
            </Link>{' '}
            and tap <strong>💸 Refund</strong>.
          </p>
          <ol className="mt-3 space-y-3 list-decimal pl-5">
            <li>
              Enter the refund amount — either the full order total or a
              partial amount.
            </li>
            <li>
              If the buyer <strong>refused delivery</strong>, choose the
              failed-delivery option. A <strong>$2 fee</strong> is deducted
              from the refund as compensation for the wasted courier trip.
            </li>
            <li>
              Enter a clear reason (the buyer will see this on their order) and
              an optional internal note.
            </li>
            <li>
              Confirm. The order flips to <Badge>refunded</Badge>, the refund
              is saved on the order, and the vendor&apos;s payout drops
              automatically.
            </li>
          </ol>
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm font-medium text-amber-900 mb-1">
              Only paid, shipped, or delivered orders can be refunded
            </p>
            <p className="text-sm text-amber-800">
              Cancelled orders and unpaid orders can&apos;t be refunded — the
              buyer never paid in the first place.
            </p>
          </div>
          <p className="mt-4 text-sm text-gray-600">
            Send the money back to the buyer via Orange Money or MoMo. We
            don&apos;t automate the cash transfer yet — the refund record is
            for your accounting.
          </p>
        </Section>

        {/* 7. Suspending vendors */}
        <Section number="7" title="Suspending a Vendor">
          <p>
            If a vendor breaks the rules — misleading products, repeat disputes,
            failure to ship — suspend them from{' '}
            <Link href="/admin/vendors" className="text-emerald-700 underline">
              /admin/vendors
            </Link>
            .
          </p>
          <p className="mt-3">
            Suspending automatically:
          </p>
          <ul className="mt-2 space-y-1 list-disc pl-5">
            <li>Archives all of the vendor&apos;s products (hidden from buyers)</li>
            <li>Downgrades their user role back to buyer</li>
            <li>Blocks them from receiving new orders</li>
          </ul>
          <p className="mt-3">
            You can <strong>reinstate</strong> them at any time. Products go
            back to active and the vendor role is restored.
          </p>
        </Section>

        {/* 8. Daily routine */}
        <Section number="8" title="Your Daily Routine">
          <ol className="space-y-3 list-decimal pl-5">
            <li>
              <strong>Morning:</strong> check your Orange Money / MoMo app for
              overnight payments. Mark matching orders as paid.
            </li>
            <li>
              <strong>Mid-day:</strong> open{' '}
              <Link href="/admin/orders" className="text-emerald-700 underline">
                /admin/orders
              </Link>{' '}
              and filter by <Badge>pending_payment</Badge> — nudge any buyers
              who haven&apos;t paid in over 24 hours.
            </li>
            <li>
              <strong>Afternoon:</strong> check{' '}
              <Badge>paid</Badge> orders — make sure vendors are shipping on
              time.
            </li>
            <li>
              <strong>End of day:</strong> run the{' '}
              <strong>Sweep stale orders</strong> button to clear out
              abandoned carts from the last 48 hours.
            </li>
            <li>
              <strong>Friday:</strong> open{' '}
              <Link href="/admin/payouts" className="text-emerald-700 underline">
                /admin/payouts
              </Link>{' '}
              and send every vendor what they&apos;re owed for the previous
              week&apos;s deliveries.
            </li>
          </ol>
        </Section>

        {/* Support */}
        <Section number="9" title="Support Contacts">
          <p>
            If anything on the platform breaks — a page errors, a payment
            won&apos;t verify, a vendor reports a bug — get in touch.
          </p>
          <ul className="mt-3 space-y-2">
            <li>
              📧{' '}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-emerald-700 underline"
              >
                {SUPPORT_EMAIL}
              </a>
            </li>
            <li>📱 {SUPPORT_PHONE}</li>
          </ul>
        </Section>

        {/* CTA */}
        <div className="mt-10 flex flex-col sm:flex-row gap-3">
          <Link
            href="/admin"
            className="flex-1 text-center px-6 py-3 rounded-lg bg-emerald-700 text-white font-semibold hover:bg-emerald-800"
          >
            Open admin panel
          </Link>
          <Link
            href="/admin/orders"
            className="flex-1 text-center px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-white"
          >
            View orders
          </Link>
        </div>
      </div>
    </main>
  );
}

// ---------- Sub-components ----------

function Section({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <div className="flex items-center gap-3">
        <span className="w-8 h-8 rounded-full bg-emerald-700 text-white text-sm font-bold flex items-center justify-center shrink-0">
          {number}
        </span>
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      </div>
      <div className="mt-4 text-gray-700 leading-relaxed">{children}</div>
    </section>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
      {children}
    </span>
  );
}