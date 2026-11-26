import { Clock, Globe2, PackageCheck, Truck } from 'lucide-react';
import { InstitutionalPageShell } from '../components/InstitutionalPageShell';

const SHIPPING_HIGHLIGHTS = [
  {
    icon: Globe2,
    label: 'Free Shipping Threshold',
    headline: 'Free US & EU Shipping on orders over $39.90.',
    detail:
      'Orders meeting the $39.90 threshold automatically qualify for complimentary tracked delivery across the United States and European Union at checkout.',
  },
  {
    icon: Clock,
    label: 'Dispatch Window',
    headline: 'Order Processing: 1-2 business days.',
    detail:
      'Every order is carefully inspected, packed, and handed off to our carrier partners within 1 to 2 business days (Monday through Friday, excluding public holidays).',
  },
  {
    icon: Truck,
    label: 'Transit Estimates',
    headline: 'US Delivery Time: 4-7 business days via USPS / FedEx.',
    detail:
      'Standard domestic US and EU shipments arrive within 4-7 business days after dispatch via USPS, FedEx, or regional express courier partners.',
  },
  {
    icon: PackageCheck,
    label: 'Order Visibility',
    headline: 'Tracking: Automatic tracking code sent via email as soon as your package ships.',
    detail:
      'You will receive a confirmation email with your live carrier tracking link the moment your package leaves our fulfillment center.',
  },
];

export function ShippingPolicyPage() {
  return (
    <InstitutionalPageShell
      breadcrumbLabel="Shipping Policy"
      sectionLabel="Fulfillment & Logistics"
      title="Shipping & Delivery Policy"
      subtitle="Fast, reliable US and EU delivery with end-to-end carrier tracking on every ZampaClub order."
    >
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {SHIPPING_HIGHLIGHTS.map((item) => {
          const Icon = item.icon;
          return (
            <article
              key={item.label}
              className="rounded-2xl bg-white border border-[#E7E5E4] p-6 space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FAFAF9] border border-[#E7E5E4] flex items-center justify-center text-[#0F766E] shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#78716C]">
                  {item.label}
                </span>
              </div>
              <h2 className="font-display text-lg font-bold text-[#1C1917] leading-snug">
                {item.headline}
              </h2>
              <p className="text-sm text-[#57534E] leading-relaxed">
                {item.detail}
              </p>
            </article>
          );
        })}
      </section>

      <section className="rounded-2xl bg-white border border-[#E7E5E4] p-6 sm:p-8 space-y-5">
        <h2 className="font-display text-xl font-bold text-[#1C1917]">
          Shipping Rates &amp; Delivery Notes
        </h2>

        <div className="divide-y divide-[#F5F5F4] text-sm text-[#57534E]">
          <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
            <span className="font-semibold text-[#1C1917]">
              Standard Tracked Shipping (Orders under $39.90)
            </span>
            <span className="tabular-nums font-semibold text-[#1C1917]">
              Calculated at checkout · 4-7 business days
            </span>
          </div>

          <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
            <span className="font-semibold text-[#1C1917]">
              Orders of $39.90 or more (US &amp; EU)
            </span>
            <span className="font-bold text-[#0F766E]">
              Free Tracked Shipping
            </span>
          </div>

          <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
            <span className="font-semibold text-[#1C1917]">
              Carriers &amp; Address Changes
            </span>
            <span>USPS / FedEx · Email hello@zampaclub.it within 12h of ordering</span>
          </div>
        </div>

        <p className="text-sm text-[#57534E] leading-relaxed pt-1">
          Please double-check your shipping address before completing checkout. If a carrier
          tracking update stalls or a parcel arrives damaged in transit, reach out to{' '}
          <a
            href="mailto:hello@zampaclub.it"
            className="font-semibold text-[#C2410C] hover:text-[#9A3412] underline underline-offset-2"
          >
            hello@zampaclub.it
          </a>{' '}
          and our team will arrange a prompt replacement or resolution.
        </p>
      </section>
    </InstitutionalPageShell>
  );
}
