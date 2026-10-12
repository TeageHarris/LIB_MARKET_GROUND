// src/app/vendor-guide/page.tsx
import Link from 'next/link';

export const metadata = {
  title: 'Vendor Guide — LIB_MARKET_GROUND',
  description:
    'How payments, commissions, and payouts work for LIB_MARKET_GROUND vendors',
};

const COMMISSION_PERCENT = 10;
const SUPPORT_EMAIL = 'libmarketgroundsupport@gmail.com';
const SUPPORT_PHONE = '+231 88 067 6703';
const ORANGE_NUMBER = '+231 776315270';
const MOMO_NUMBER = '+231 88 699 3491';
const WHATAPP_NUMBER = '+231 88 067 6703';

export default function VendorGuidePage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link href="/" className="text-sm text-emerald-700 hover:underline">
          ← Back to home
        </Link>

        <header className="mt-6">
          <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
            For Vendors
          </p>
          <h1 className="mt-2 text-4xl font-bold text-gray-900">Vendor Guide</h1>
          <p className="mt-3 text-gray-600 leading-relaxed">
            Everything you need to know about selling on LIB_MARKET_GROUND — how
            buyers pay, how shipping works, how your commission is calculated,
            and how you get paid every week.
          </p>
        </header>

        {/* 1. How buyers pay */}
        <Section number="1" title="How Buyers Pay">
          <p>
            When a buyer purchases your product,{' '}
            <strong>they pay LIB_MARKET_GROUND, not you directly.</strong>
          </p>
          <ul className="mt-3 space-y-2 list-disc pl-5">
            <li>Buyer sends money to our Orange Money / MoMo account</li>
            <li>Our team verifies the payment (usually within a few hours)</li>
            <li>
              Once verified, your order status changes to <Badge>paid</Badge> —
              you&apos;ll see it in your dashboard
            </li>
            <li>
              <strong>At that point, you ship the product</strong>
            </li>
          </ul>
          <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <p className="text-sm font-medium text-emerald-800 mb-2">
              Why we do it this way
            </p>
            <ul className="text-sm text-emerald-700 space-y-1 list-disc pl-5">
              <li>
                <strong>Buyer protection</strong> — buyers trust the marketplace
                more than individuals
              </li>
              <li>
                <strong>Your protection</strong> — we confirm the buyer has
                actually paid before you ship
              </li>
              <li>
                <strong>No chasing payments</strong> — you never argue with a
                buyer about money
              </li>
              <li>
                <strong>Fraud prevention</strong> — we screen out fake payments
                before they reach you
              </li>
            </ul>
          </div>
        </Section>

        {/* 2. Shipping fees */}
        <Section number="2" title="Shipping Fees — You Set Them Per Order">
          <p>
            Shipping is handled <strong>cash on delivery</strong>. The buyer
            pays the shipping fee directly to the courier when the product
            arrives — the platform never touches this money.
          </p>
          <p className="mt-3 font-medium text-gray-900">
            How it works now
          </p>
          <ol className="mt-3 space-y-2 list-decimal pl-5">
            <li>
              Buyer places an order. It arrives in your dashboard as{' '}
              <Badge>pending_shipping_quote</Badge>.
            </li>
            <li>
              Open the order — you&apos;ll see the buyer&apos;s full delivery
              address, so you know exactly where it&apos;s going.
            </li>
            <li>
              Click <strong>Set shipping fee</strong> and enter a fee based on
              the distance and size of the item.
            </li>
            <li>
              The order flips to <Badge>pending_payment</Badge>. The buyer sees
              the fee, pays the product price to us, and pays your shipping fee
              in cash to the courier on arrival.
            </li>
            <li>
              The courier hands the cash to you when they settle.
            </li>
          </ol>
          <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <p className="text-sm font-medium text-emerald-800 mb-2">
              You can suggest a starting fee
            </p>
            <p className="text-sm text-emerald-700">
              When you open the &quot;Set shipping fee&quot; prompt, it
              prefills with your <strong>default shipping rate</strong> (set in
              your vendor settings). That&apos;s just a suggestion — adjust it
              for each order based on the actual address.
            </p>
          </div>
          <p className="mt-3 text-sm text-gray-600">
            <strong>Shipping is 100% yours.</strong> The {COMMISSION_PERCENT}%
            commission applies to the product price only — never to the
            shipping fee.
          </p>
        </Section>

        {/* 3. Commission */}
        <Section number="3" title={`Platform Commission — ${COMMISSION_PERCENT}%`}>
          <p>
            We charge a <strong>{COMMISSION_PERCENT}% commission</strong> on
            every sale. It&apos;s deducted automatically from your payout —
            you don&apos;t send us anything.
          </p>
          <div className="mt-4 bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-900 mb-2">Example</p>
            <dl className="text-sm space-y-1">
              <div className="flex justify-between">
                <dt className="text-gray-600">Product sells for</dt>
                <dd className="text-gray-900">$100.00</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">
                  Platform commission ({COMMISSION_PERCENT}%)
                </dt>
                <dd className="text-gray-900">−$10.00</dd>
              </div>
              <div className="flex justify-between font-semibold border-t pt-2 mt-2">
                <dt className="text-gray-900">You receive</dt>
                <dd className="text-emerald-700">$90.00</dd>
              </div>
            </dl>
          </div>
          <p className="mt-3 text-sm text-gray-600">
            The commission covers payment processing, hosting and security,
            customer support, and marketing that brings buyers to your products.
          </p>
        </Section>

        {/* 4. Payouts */}
        <Section number="4" title="How You Get Paid">
          <p>
            We pay out your earnings{' '}
            <strong>
              every Friday for orders that were delivered the previous week
            </strong>
            , via Orange Money or Lonestar MoMo.
          </p>
          <p className="mt-3 font-medium text-gray-900">
            Only <em>delivered</em> orders count toward a payout
          </p>
          <p className="mt-2">
            An order only becomes payable once the buyer clicks{' '}
            <strong>&quot;Confirm delivery received&quot;</strong>. Until then,
            it shows as <em>pending</em> in your earnings — not yet owed to you.
          </p>
          <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <p className="text-sm font-medium text-emerald-800 mb-2">
              Track your earnings on your dashboard
            </p>
            <p className="text-sm text-emerald-700">
              Open{' '}
              <Link
                href="/vendor/payouts"
                className="underline font-medium"
              >
                your payouts page
              </Link>{' '}
              any time to see:
            </p>
            <ul className="mt-2 text-sm text-emerald-700 space-y-1 list-disc pl-5">
              <li>
                <strong>Pending</strong> — orders in flight (not yet delivered)
              </li>
              <li>
                <strong>Payable now</strong> — delivered orders you&apos;ll get
                on the next Friday
              </li>
              <li>
                <strong>Total paid</strong> — everything you&apos;ve received
                all-time
              </li>
              <li>
                <strong>Payout history</strong> — each payment with its
                transaction reference
              </li>
            </ul>
          </div>
          <div className="mt-4 bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-900 mb-2">
              Example week
            </p>
            <dl className="text-sm space-y-1">
              <div className="flex justify-between">
                <dt className="text-gray-600">Delivered this week</dt>
                <dd className="text-gray-900">$500.00</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">
                  Platform commission ({COMMISSION_PERCENT}%)
                </dt>
                <dd className="text-gray-900">−$50.00</dd>
              </div>
              <div className="flex justify-between font-semibold border-t pt-2 mt-2">
                <dt className="text-gray-900">You receive Friday</dt>
                <dd className="text-emerald-700">$450.00</dd>
              </div>
            </dl>
          </div>
        </Section>

        {/* 5. Order lifecycle */}
        <Section number="5" title="The Order Lifecycle">
          <ul className="space-y-4">
            <LifecycleStep
              step="1"
              status="pending_shipping_quote"
              label="Buyer has placed the order"
              desc="You see the buyer's full address. Set the shipping fee to move things forward."
            />
            <LifecycleStep
              step="2"
              status="pending_payment"
              label="Waiting for buyer to pay"
              desc="You've quoted the shipping. The buyer will pay the product price to us — you wait."
            />
            <LifecycleStep
              step="3"
              status="paid"
              label="Payment verified — ship now"
              desc="We've confirmed the buyer paid. This is your green light to ship."
            />
            <LifecycleStep
              step="4"
              status="shipped"
              label="You marked it shipped"
              desc="The buyer is waiting for delivery. The courier collects the shipping fee in cash on arrival."
            />
            <LifecycleStep
              step="5"
              status="delivered"
              label="Buyer confirmed delivery"
              desc="The order closes. Your net earnings enter the payout queue for the next Friday."
            />
          </ul>
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm font-medium text-amber-900 mb-1">
              Do not ship until the order shows &quot;paid&quot;
            </p>
            <p className="text-sm text-amber-800">
              Shipping to an unpaid order is at your own risk. If the buyer
              never pays, we can&apos;t reimburse your shipping or product loss.
            </p>
          </div>
        </Section>

        {/* 6. Refunds and disputes */}
        <Section number="6" title="Refunds and Disputes">
          <p>
            If a buyer disputes an order, we investigate first — proof of
            shipment, tracking, buyer communication. If the dispute is valid, we
            may refund the buyer. Refunds are deducted from your next payout.
          </p>
          <p className="mt-3 font-medium text-gray-900">
            Refused delivery
          </p>
          <p className="mt-2">
            If a buyer refuses to accept a delivery (or refuses to pay the
            shipping fee), the product comes back to you. In that case:
          </p>
          <ul className="mt-2 space-y-1 list-disc pl-5">
            <li>
              The buyer is refunded the product price{' '}
              <strong>minus a $2 failed-delivery fee</strong> — as compensation
              for the wasted courier trip
            </li>
            <li>
              Shipping fees are handled directly between you and the courier —
              we don&apos;t touch them
            </li>
            <li>
              The refunded order drops out of your payout automatically
            </li>
          </ul>
          <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <p className="text-sm font-medium text-emerald-800 mb-1">
              We take your side when you&apos;ve followed the rules
            </p>
            <p className="text-sm text-emerald-700">
              Shipped on time, honest product description, tracked delivery —
              if all of that checks out, we protect you in disputes.
            </p>
          </div>
        </Section>

        {/* 7. Responsibilities */}
        <Section number="7" title="Your Responsibilities">
          <ul className="mt-3 space-y-2 list-disc pl-5">
            <li>
              <strong>Describe products honestly</strong> — no misleading
              photos or descriptions
            </li>
            <li>
              <strong>Quote shipping accurately</strong> — set a fair fee for
              each buyer&apos;s location
            </li>
            <li>
              <strong>Package securely</strong> — the buyer paid shipping;
              make sure the product arrives undamaged
            </li>
            <li>
              <strong>Ship within 3 business days</strong> of an order being
              marked paid
            </li>
            <li>
              <strong>Mark orders as shipped</strong> so buyers can track
            </li>
            <li>
              <strong>Respond to questions within 24 hours</strong>
            </li>
            <li>
              <strong>Keep stock accurate</strong> so we don&apos;t oversell
            </li>
          </ul>
          <p className="mt-3 text-sm text-gray-600">
            Failure to follow these may result in suspension from the platform.
          </p>
        </Section>

        {/* 8. Who controls what */}
        <Section number="8" title="Who Controls What">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-gray-900 mb-2">
                You control
              </p>
              <ul className="text-sm text-gray-700 space-y-1 list-disc pl-4">
                <li>Your prices</li>
                <li>Product descriptions &amp; photos</li>
                <li>Stock levels</li>
                <li>Shipping fee per order</li>
                <li>When you ship (once paid)</li>
              </ul>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-gray-900 mb-2">
                We control
              </p>
              <ul className="text-sm text-gray-700 space-y-1 list-disc pl-4">
                <li>Collecting buyer payments</li>
                <li>Verifying payments are real</li>
                <li>The checkout flow</li>
                <li>Handling refunds &amp; disputes</li>
                <li>Paying you weekly</li>
              </ul>
            </div>
          </div>
        </Section>

        {/* 9. Contact */}
        <Section number="9" title="Questions?">
          <p>
            Reach out anytime — we respond within a few hours.
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
            <li className="text-sm text-gray-600">
              Orange Money: {ORANGE_NUMBER} · MoMo: {MOMO_NUMBER}
            </li>
          </ul>
        </Section>

        {/* CTA */}
        <div className="mt-10 flex flex-col sm:flex-row gap-3">
          <Link
            href="/become-vendor"
            className="flex-1 text-center px-6 py-3 rounded-lg bg-emerald-700 text-white font-semibold hover:bg-emerald-800"
          >
            Apply to become a vendor
          </Link>
          <Link
            href="/login"
            className="flex-1 text-center px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-white"
          >
            Log in
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

function LifecycleStep({
  step,
  status,
  label,
  desc,
}: {
  step: string;
  status: string;
  label: string;
  desc: string;
}) {
  return (
    <li className="flex gap-3 items-start">
      <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-700 text-xs font-bold flex items-center justify-center shrink-0 mt-1">
        {step}
      </span>
      <div>
        <p className="font-medium text-gray-900 text-sm">
          {label}{' '}
          <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono text-gray-600">
            {status}
          </code>
        </p>
        <p className="text-sm text-gray-600 mt-0.5">{desc}</p>
      </div>
    </li>
  );
}