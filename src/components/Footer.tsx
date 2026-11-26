import { CheckCircle2, Mail, MapPin, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MacroCategorySlug, WooCategory } from '../types/shop';
import { ZampaLogo } from './ZampaLogo';

interface FooterProps {
  wooCategories: WooCategory[];
  onSelectCategory: (
    slug: MacroCategorySlug,
    subFilter?: string,
    categoryId?: number
  ) => void;
  onOpenAccount?: () => void;
}

const CUSTOMER_CARE_LINKS = [
  { label: 'FAQ', href: '/faq' },
  { label: 'Track Order', href: '/track-order' },
  { label: 'Shipping Policy', href: '/shipping-policy' },
  { label: 'Returns & Warranty', href: '/returns-warranty' },
  { label: 'Contact Us', href: '/contact' },
];

const LEGAL_POLICY_LINKS = [
  { label: 'Privacy Policy', href: '/privacy-policy' },
  { label: 'Terms of Service', href: '/terms-of-service' },
  { label: 'Refund Policy', href: '/refund-policy' },
];

export function Footer({
  wooCategories,
  onSelectCategory,
}: FooterProps) {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubscribed(true);
    setEmail('');
  };

  const footerCategories = wooCategories.filter((c) => c.parent === 0).slice(0, 6);

  return (
    <footer className="defer-section bg-white border-t border-[#E7E5E4] mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-24 sm:py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8">
          {/* Brand & Newsletter */}
          <div className="md:col-span-2 lg:col-span-4 space-y-5">
            <ZampaLogo size="md" />
            <p className="text-sm text-[#57534E] leading-relaxed max-w-md">
              A modern pet boutique dedicated to the everyday comfort of dogs, cats, and
              small pets. Thoughtfully vetted accessories, durable materials, and smart pet
              care essentials.
            </p>

            <div className="rounded-2xl bg-[#FAFAF9] border border-[#E7E5E4] p-5 space-y-3 max-w-md">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display text-base font-bold text-[#1C1917]">
                  Get 10% off your first order
                </h3>
                <span className="text-xs font-semibold text-[#0F766E]">Club Newsletter</span>
              </div>
              <p className="text-xs text-[#57534E]">
                Unlock your welcome discount and weekly curated pet finds. Zero spam.
              </p>

              {subscribed ? (
                <div className="flex items-center gap-2 rounded-xl bg-[#0F766E]/10 border border-[#0F766E]/25 px-3.5 py-2.5 text-sm text-[#115E59] font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    You&apos;re in! Use code{' '}
                    <strong className="font-bold tracking-wide">ZAMPA10</strong> at checkout.
                  </span>
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2">
                  <label htmlFor="footer-newsletter" className="sr-only">
                    Email address for 10% off
                  </label>
                  <input
                    id="footer-newsletter"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email..."
                    className="flex-1 min-w-0 min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white border border-[#E7E5E4] text-base sm:text-sm text-[#1C1917] placeholder:text-[#78716C] focus:outline-none focus:ring-2 focus:ring-[#C2410C]/30 focus:border-[#C2410C]"
                  />
                  <button
                    type="submit"
                    className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#C2410C] hover:bg-[#9A3412] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9A3412] text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
                  >
                    Get 10% Off
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Categories */}
          <div className="lg:col-span-2 space-y-3.5">
            <h3 className="text-sm font-bold text-[#1C1917]">Categories</h3>
            <ul className="space-y-2.5 text-sm text-[#57534E]">
              {footerCategories.map((cat) => (
                <li key={cat.id}>
                  <button
                    type="button"
                    onClick={() => onSelectCategory(cat.slug, undefined, cat.id)}
                    className="py-1 inline-block hover:text-[#C2410C] transition-colors text-left"
                  >
                    {cat.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Customer Care */}
          <div className="lg:col-span-2 space-y-3.5">
            <h3 className="text-sm font-bold text-[#1C1917]">Customer Care</h3>
            <ul className="space-y-2 text-sm text-[#57534E]">
              {CUSTOMER_CARE_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="py-1 inline-block hover:text-[#C2410C] transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="pt-2 space-y-1.5 text-xs text-[#57534E]">
              <a
                href="mailto:hello@zampaclub.it"
                className="flex items-center gap-2 hover:text-[#C2410C] transition-colors"
              >
                <Mail className="w-3.5 h-3.5 text-[#0F766E] shrink-0" />
                <span>hello@zampaclub.it</span>
              </a>
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#0F766E] shrink-0" />
                <span>Shipping across the United States</span>
              </div>
            </div>
          </div>

          {/* Legal & Policies */}
          <div className="lg:col-span-2 space-y-3.5">
            <h3 className="text-sm font-bold text-[#1C1917]">Legal &amp; Policies</h3>
            <ul className="space-y-2 text-sm text-[#57534E]">
              {LEGAL_POLICY_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="py-1 inline-block hover:text-[#C2410C] transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Secure Payments */}
          <div className="lg:col-span-2 space-y-3.5">
            <h3 className="text-sm font-bold text-[#1C1917]">Secure Payments</h3>
            <p className="text-xs text-[#57534E] leading-relaxed">
              256-bit SSL encrypted transactions via WooCommerce Checkout.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {['VISA', 'Mastercard', 'Amex', 'PayPal', 'Apple Pay', 'Klarna'].map(
                (method) => (
                  <div
                    key={method}
                    className="px-2.5 py-2 rounded-lg border border-[#E7E5E4] bg-[#FAFAF9] text-center text-xs font-semibold text-[#1C1917]"
                  >
                    {method}
                  </div>
                )
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#0F766E] font-medium pt-1">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>256-bit SSL Protected</span>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-[#E7E5E4] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#57534E]">
          <p>© {new Date().getFullYear()} Zampa Club · Modern Pet Boutique. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link to="/privacy-policy" className="hover:text-[#C2410C] transition-colors">
              Privacy Policy
            </Link>
            <span aria-hidden="true">·</span>
            <Link to="/terms-of-service" className="hover:text-[#C2410C] transition-colors">
              Terms of Service
            </Link>
            <span aria-hidden="true">·</span>
            <Link to="/returns-warranty" className="hover:text-[#C2410C] transition-colors">
              Returns &amp; Warranty
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
