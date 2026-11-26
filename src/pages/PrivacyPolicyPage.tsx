import { Cookie, Lock, ShieldCheck, UserCheck } from 'lucide-react';
import { InstitutionalPageShell } from '../components/InstitutionalPageShell';

const PRIVACY_SECTIONS = [
  {
    icon: ShieldCheck,
    title: '1. Information We Collect & Purpose',
    paragraphs: [
      'When you browse ZampaClub or place an order, we collect only the information necessary to fulfill your purchase and provide customer support. This includes your name, billing and shipping address, email address, phone number (for courier delivery updates), and order details.',
      'We do not sell, rent, or trade your personal information to third-party data brokers.',
    ],
  },
  {
    icon: Lock,
    title: '2. 256-Bit SSL Security & Payment Processing',
    paragraphs: [
      'All browsing and checkout data transmitted between your browser and ZampaClub is protected with 256-bit SSL/TLS encryption.',
      'Payments are processed directly via our encrypted WooCommerce Checkout infrastructure and certified payment providers (such as VISA, Mastercard, American Express, PayPal, Apple Pay, and Klarna). ZampaClub never stores raw credit card numbers or CVV codes on its servers.',
    ],
  },
  {
    icon: Cookie,
    title: '3. Essential Cookies & Session Storage',
    paragraphs: [
      'We use strictly necessary browser storage and session tokens (including your shopping cart state and anonymous WooCommerce Cart-Token) so items in your cart persist across page reloads and smoothly sync with checkout.',
      'You can clear cookies or browser storage at any time in your browser settings. Essential cart tokens remain strictly functional and are not used for cross-site advertising tracking.',
    ],
  },
  {
    icon: UserCheck,
    title: '4. Your GDPR (EU) & CCPA (US) Privacy Rights',
    paragraphs: [
      'Under the European Union General Data Protection Regulation (GDPR) and the California Consumer Privacy Act (CCPA / CPRA), you have the right to request access to the personal data we hold about you, ask for corrections, request deletion of your account or order records (subject to statutory tax retention duties), and withdraw consent at any time.',
      'To exercise any privacy right or request a data export, email our privacy team at hello@zampaclub.it. We will respond within 30 days without discrimination.',
    ],
  },
];

export function PrivacyPolicyPage() {
  return (
    <InstitutionalPageShell
      breadcrumbLabel="Privacy Policy"
      sectionLabel="Legal & Data Protection"
      title="Privacy Policy"
      subtitle="How ZampaClub collects, protects, and respects your personal data in compliance with GDPR and US CCPA standards."
      lastUpdated="2026"
    >
      <div className="space-y-4">
        {PRIVACY_SECTIONS.map((sec) => {
          const Icon = sec.icon;
          return (
            <section
              key={sec.title}
              className="rounded-2xl bg-white border border-[#E7E5E4] p-6 sm:p-7 space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#FAFAF9] border border-[#E7E5E4] flex items-center justify-center text-[#0F766E] shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <h2 className="font-display text-lg sm:text-xl font-bold text-[#1C1917]">
                  {sec.title}
                </h2>
              </div>

              <div className="space-y-2.5 text-sm sm:text-base text-[#57534E] leading-relaxed">
                {sec.paragraphs.map((p, idx) => (
                  <p key={idx}>{p}</p>
                ))}
              </div>
            </section>
          );
        })}

        <section className="rounded-2xl bg-white border border-[#E7E5E4] p-6 sm:p-7 space-y-2">
          <h2 className="font-display text-lg font-bold text-[#1C1917]">
            5. Data Controller Contact
          </h2>
          <p className="text-sm sm:text-base text-[#57534E] leading-relaxed">
            For any questions regarding this Privacy Policy, cookie usage, or data retention,
            contact ZampaClub Privacy Support at{' '}
            <a
              href="mailto:hello@zampaclub.it"
              className="font-semibold text-[#C2410C] hover:text-[#9A3412] underline underline-offset-2"
            >
              hello@zampaclub.it
            </a>
            .
          </p>
        </section>
      </div>
    </InstitutionalPageShell>
  );
}
