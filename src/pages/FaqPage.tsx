import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { InstitutionalPageShell } from '../components/InstitutionalPageShell';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'shipping-time',
    question: 'How long does shipping take?',
    answer:
      'Orders ship within 1-2 business days. US/EU delivery takes 4-7 business days with full tracking.',
  },
  {
    id: 'car-seat-fit',
    question: 'Will the car seat cover fit my vehicle?',
    answer:
      'Yes! Designed with universal dimensions (approx 169x116 cm) to fit almost all standard cars, SUVs, and trucks.',
  },
  {
    id: 'waterproof-cleaning',
    question: 'Is it waterproof and easy to clean?',
    answer:
      'Absolutely. Made of heavy-duty 600D Oxford fabric. Easy to wipe clean with a damp cloth or vacuum.',
  },
  {
    id: 'included-items',
    question: 'What is included with the seat cover?',
    answer:
      'Each set includes the waterproof car seat cover plus 1 safety belt strap for your dog.',
  },
  {
    id: 'returns-process',
    question: 'How do I return an item?',
    answer:
      'We offer a 30-day money-back guarantee. Contact support at hello@zampaclub.it for smooth returns.',
  },
];

export function FaqPage() {
  const [openId, setOpenId] = useState<string | null>(FAQ_ITEMS[0].id);

  const toggleItem = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <InstitutionalPageShell
      breadcrumbLabel="FAQ"
      sectionLabel="Customer Care"
      title="Frequently Asked Questions"
      subtitle="Everything you need to know about ZampaClub products, shipping, and guarantees."
    >
      <section aria-label="FAQ Accordion" className="space-y-3">
        {FAQ_ITEMS.map((item, idx) => {
          const isOpen = openId === item.id;
          const panelId = `faq-panel-${item.id}`;
          const buttonId = `faq-trigger-${item.id}`;

          return (
            <div
              key={item.id}
              className={`rounded-2xl bg-white border transition-colors ${
                isOpen ? 'border-[#C2410C]/45 shadow-sm' : 'border-[#E7E5E4]'
              }`}
            >
              <h2 className="m-0">
                <button
                  id={buttonId}
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => toggleItem(item.id)}
                  className="w-full min-h-[60px] px-5 sm:px-6 py-4 flex items-center justify-between gap-4 text-left rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#C2410C]"
                >
                  <span className="flex items-baseline gap-3 min-w-0">
                    <span className="text-xs font-bold text-[#C2410C] tabular-nums shrink-0">
                      0{idx + 1}
                    </span>
                    <span className="font-display text-base sm:text-lg font-bold text-[#1C1917] leading-snug">
                      {item.question}
                    </span>
                  </span>

                  <ChevronDown
                    aria-hidden="true"
                    className={`w-5 h-5 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-[#C2410C]' : 'text-[#78716C]'
                    }`}
                  />
                </button>
              </h2>

              {isOpen && (
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  className="px-5 sm:px-6 pb-5 pt-0.5 pl-12 sm:pl-14 text-sm sm:text-base text-[#57534E] leading-relaxed"
                >
                  {item.answer}
                </div>
              )}
            </div>
          );
        })}
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          to="/shipping-policy"
          className="rounded-2xl bg-white border border-[#E7E5E4] hover:border-[#C2410C]/50 p-5 sm:p-6 transition-colors group"
        >
          <p className="text-xs font-bold uppercase tracking-wider text-[#0F766E]">
            Delivery Details
          </p>
          <h3 className="font-display text-lg font-bold text-[#1C1917] mt-1 group-hover:text-[#C2410C] transition-colors">
            Shipping &amp; Delivery Policy
          </h3>
          <p className="text-sm text-[#57534E] mt-1.5 leading-relaxed">
            Review processing timelines, free shipping threshold over $39.90, and tracking details.
          </p>
        </Link>

        <Link
          to="/returns-warranty"
          className="rounded-2xl bg-white border border-[#E7E5E4] hover:border-[#C2410C]/50 p-5 sm:p-6 transition-colors group"
        >
          <p className="text-xs font-bold uppercase tracking-wider text-[#0F766E]">
            Peace of Mind
          </p>
          <h3 className="font-display text-lg font-bold text-[#1C1917] mt-1 group-hover:text-[#C2410C] transition-colors">
            30-Day Returns &amp; Warranty
          </h3>
          <p className="text-sm text-[#57534E] mt-1.5 leading-relaxed">
            Learn about our 30-day money-back guarantee and lifetime quality protection.
          </p>
        </Link>
      </section>
    </InstitutionalPageShell>
  );
}
