import { Award, CheckCircle2, ShieldCheck, Star, Truck } from 'lucide-react';
import { VERIFIED_REVIEWS } from '../data/storefrontAssets';

export function WhyZampaAndReviews() {
  return (
    <section className="defer-section max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      {/* Why Choose Zampa Club */}
      <div className="rounded-2xl bg-white border border-[#E7E5E4] p-6 sm:p-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-[#0F766E]">
              The Zampa Club Standard
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#1C1917] tracking-tight text-balance">
              Why pet parents choose Zampa Club
            </h2>
            <p className="text-sm sm:text-base text-[#57534E] leading-relaxed">
              We don&apos;t stock an overwhelming wall of lookalike gadgets. Every bed,
              harness, and smart feeder is vetted for real-life durability, pet-safe
              materials, and effortless daily cleaning.
            </p>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                icon: Award,
                title: 'Curated by Pet Lovers',
                body: 'Every product is evaluated for ergonomics, chew-safe finishes, and washable fabrics.',
              },
              {
                icon: Truck,
                title: 'Tracked & Transparent Delivery',
                body: 'Free shipping on orders over $39 with automated tracking updates straight to your inbox.',
              },
              {
                icon: ShieldCheck,
                title: '30-Day Hassle-Free Returns',
                body: 'Wrong harness size or change of mind? Our support team makes exchanges simple.',
              },
              {
                icon: CheckCircle2,
                title: 'Exact Fit & Option Sizing',
                body: 'Clear size and color variations mapped directly to WooCommerce checkout.',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-xl bg-[#FAFAF9] border border-[#E7E5E4] p-4 space-y-1.5"
                >
                  <div className="flex items-center gap-2 text-[#1C1917] font-bold text-sm">
                    <Icon className="w-4 h-4 text-[#C2410C] shrink-0" />
                    <span>{item.title}</span>
                  </div>
                  <p className="text-xs text-[#57534E] leading-relaxed">{item.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Verified Customer Reviews */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-6">
          <div>
            <h2 className="font-display text-2xl font-bold text-[#1C1917] tracking-tight">
              What dog & cat parents are saying
            </h2>
            <p className="text-sm text-[#57534E] mt-0.5">
              Rated <strong className="text-[#1C1917] tabular-nums">4.9 / 5</strong>{' '}
              across 1,200+ verified orders
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {VERIFIED_REVIEWS.map((rev) => (
            <article
              key={rev.id}
              className="rounded-2xl bg-white border border-[#E7E5E4] p-6 flex flex-col justify-between gap-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div
                    role="img"
                    className="flex items-center gap-0.5"
                    aria-label={`${rev.rating} out of 5 stars`}
                  >
                    {Array.from({ length: rev.rating }).map((_, idx) => (
                      <Star
                        key={idx}
                        aria-hidden="true"
                        className="w-4 h-4 fill-[#C2410C] text-[#C2410C]"
                      />
                    ))}
                  </div>
                  <span className="text-xs font-medium text-[#0F766E] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                    Verified Buyer
                  </span>
                </div>

                <h3 className="font-display text-base font-bold text-[#1C1917]">
                  {rev.title}
                </h3>

                <p className="text-sm text-[#57534E] leading-relaxed">
                  &ldquo;{rev.comment}&rdquo;
                </p>
              </div>

              <div className="pt-4 border-t border-[#F5F5F4] space-y-1">
                <div className="text-sm font-bold text-[#1C1917]">
                  {rev.author} · <span className="font-normal text-[#57534E]">{rev.city}</span>
                </div>
                <div className="text-xs text-[#78716C]">
                  With {rev.petName} ({rev.petType}) · {rev.productPurchased}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
