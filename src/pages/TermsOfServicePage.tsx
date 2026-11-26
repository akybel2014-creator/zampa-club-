import { Link } from 'react-router-dom';
import { InstitutionalPageShell } from '../components/InstitutionalPageShell';

const TERMS_SECTIONS = [
  {
    title: '1. Storefront Acceptance & Eligibility',
    body: [
      'By accessing or placing an order through ZampaClub (shop.zampaclub.it), you agree to be bound by these Terms of Service and all applicable commercial laws. You confirm that you are at least the age of majority in your jurisdiction and that all billing and shipping details submitted at checkout are accurate and complete.',
    ],
  },
  {
    title: '2. Products, Pricing & Order Acceptance',
    body: [
      'All product descriptions, measurements, and prices are presented as accurately as possible in US Dollars (USD) unless otherwise noted. ZampaClub reserves the right to adjust pricing, discontinue items, or cancel an order prior to dispatch in the event of a pricing error, stock discrepancy, or suspected fraudulent activity.',
      'Your order constitutes an offer to purchase; acceptance is confirmed when your payment is authorized on our encrypted WooCommerce checkout and your order confirmation is issued.',
    ],
  },
  {
    title: '3. Shipping, Risk of Loss & Returns',
    body: [
      'Orders ship within 1-2 business days and include full carrier tracking. Free US & EU shipping applies on eligible orders over $39.90. Eligible purchases are covered by our 30-Day Money-Back Guarantee and Lifetime Quality Guarantee.',
    ],
  },
  {
    title: '4. Intellectual Property',
    body: [
      'All content published on this storefront—including the ZampaClub name, logo, photography, product copy, UI layouts, and graphic assets—is the exclusive intellectual property of ZampaClub or its licensors and is protected by applicable trademark and copyright laws. Reproduction or commercial redistribution without written permission is prohibited.',
    ],
  },
  {
    title: '5. Limitation of Liability',
    body: [
      'ZampaClub provides pet accessories and care essentials designed for responsible pet ownership. To the fullest extent permitted by applicable law, ZampaClub shall not be liable for any indirect, incidental, or consequential damages arising from product misuse or carrier delays outside our reasonable control. Our total aggregate liability for any claim relating to an order shall not exceed the purchase price paid for that order.',
    ],
  },
  {
    title: '6. Changes to These Terms & Contact',
    body: [
      'We may update these Terms of Service periodically to reflect operational or regulatory changes. Continued use of the storefront after updates take effect constitutes acceptance of the revised terms. Questions may be directed to hello@zampaclub.it.',
    ],
  },
];

export function TermsOfServicePage() {
  return (
    <InstitutionalPageShell
      breadcrumbLabel="Terms of Service"
      sectionLabel="Legal & Terms of Sale"
      title="Terms of Service"
      subtitle="Standard terms governing browsing, purchases, intellectual property, and liability on ZampaClub."
      lastUpdated="2026"
    >
      <div className="space-y-4">
        {TERMS_SECTIONS.map((sec) => (
          <section
            key={sec.title}
            className="rounded-2xl bg-white border border-[#E7E5E4] p-6 sm:p-7 space-y-2.5"
          >
            <h2 className="font-display text-lg sm:text-xl font-bold text-[#1C1917]">
              {sec.title}
            </h2>
            <div className="space-y-2.5 text-sm sm:text-base text-[#57534E] leading-relaxed">
              {sec.body.map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>
          </section>
        ))}

        <div className="rounded-2xl bg-white border border-[#E7E5E4] p-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-[#57534E]">
          <span>Related Policies:</span>
          <Link
            to="/shipping-policy"
            className="font-semibold text-[#C2410C] hover:text-[#9A3412] underline underline-offset-2"
          >
            Shipping Policy
          </Link>
          <Link
            to="/returns-warranty"
            className="font-semibold text-[#C2410C] hover:text-[#9A3412] underline underline-offset-2"
          >
            Returns &amp; Warranty
          </Link>
          <Link
            to="/privacy-policy"
            className="font-semibold text-[#C2410C] hover:text-[#9A3412] underline underline-offset-2"
          >
            Privacy Policy
          </Link>
        </div>
      </div>
    </InstitutionalPageShell>
  );
}
