import { ArrowRight, CheckCircle2, HeartHandshake, Lock, Truck } from 'lucide-react';
import { HERO_ASSETS } from '../data/storefrontAssets';
import { MacroCategorySlug } from '../types/shop';
import { ResilientImage } from './ResilientImage';

interface HeroSectionProps {
  onExploreBestSellers: () => void;
  onSelectCategory: (slug: MacroCategorySlug) => void;
}

export function HeroSection({
  onExploreBestSellers,
  onSelectCategory,
}: HeroSectionProps) {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-8">
      {/* Asymmetric Hero Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Main Emotional Hero Banner */}
        <div className="lg:col-span-8 relative rounded-2xl overflow-hidden border border-[#E7E5E4] bg-[#1C1917] min-h-[380px] sm:min-h-[440px] flex items-end">
          <ResilientImage
            src={HERO_ASSETS.mainBanner}
            alt="Happy Golden Retriever dog and tabby cat relaxing on a sunlit sofa"
            loading="eager"
            fetchPriority="high"
            decoding="async"
            width={1376}
            height={768}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/15"
            aria-hidden="true"
          />

          <div className="relative z-10 p-6 sm:p-10 max-w-2xl space-y-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#FDBA74]">
              Pet Boutique · Care & Comfort Collection
            </div>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-[42px] font-bold text-white leading-[1.12] tracking-tight text-balance">
              Everything your four-legged best friend needs to thrive
            </h1>
            <p className="text-sm sm:text-base text-[#E7E5E4] leading-relaxed max-w-xl">
              Orthopedic memory foam beds, ergonomic harnesses, Nordic cat trees, and smart
              pet tech tested by dog and cat parents nationwide.
            </p>
            <div className="pt-1 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onExploreBestSellers}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#C2410C] hover:bg-[#9A3412] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white text-white text-sm font-semibold shadow-sm transition-colors whitespace-nowrap"
              >
                <span>Shop Best Sellers</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onSelectCategory('deals')}
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-white/15 hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white backdrop-blur-sm text-white text-sm font-semibold border border-white/25 transition-colors whitespace-nowrap"
              >
                Monthly Deals
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: 2 Dedicated Promo Cards (Dogs & Cats) */}
        <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-5">
          {/* Dogs Collection */}
          <button
            type="button"
            onClick={() => onSelectCategory('dogs')}
            className="group relative rounded-2xl overflow-hidden border border-[#E7E5E4] bg-white text-left min-h-[205px] flex items-end transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md"
          >
            <ResilientImage
              src={HERO_ASSETS.promoDogs}
              alt="French Bulldog wearing an orange ergonomic harness"
              loading="eager"
              fetchPriority="low"
              decoding="async"
              width={900}
              height={672}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"
              aria-hidden="true"
            />
            <div className="relative z-10 p-5 w-full flex items-end justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[#FDBA74]">
                  Walk & Rest Essentials
                </div>
                <h2 className="font-display text-xl font-bold text-white mt-0.5">
                  Dogs Collection
                </h2>
                <p className="text-xs text-[#E7E5E4] mt-0.5">
                  No-pull harnesses & orthopedic beds
                </p>
              </div>
              <span className="w-9 h-9 rounded-full bg-[#C2410C] text-white inline-flex items-center justify-center shrink-0 group-hover:bg-[#9A3412] transition-colors">
                <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </button>

          {/* Cats Collection */}
          <button
            type="button"
            onClick={() => onSelectCategory('cats')}
            className="group relative rounded-2xl overflow-hidden border border-[#E7E5E4] bg-white text-left min-h-[205px] flex items-end transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md"
          >
            <ResilientImage
              src={HERO_ASSETS.promoCats}
              alt="British Shorthair cat lounging on a birch wood cat perch"
              loading="eager"
              fetchPriority="low"
              decoding="async"
              width={900}
              height={672}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"
              aria-hidden="true"
            />
            <div className="relative z-10 p-5 w-full flex items-end justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[#5EEAD4]">
                  Cat Trees & Fountains
                </div>
                <h2 className="font-display text-xl font-bold text-white mt-0.5">
                  Cats Collection
                </h2>
                <p className="text-xs text-[#E7E5E4] mt-0.5">
                  Nordic design & whisper-quiet hydration
                </p>
              </div>
              <span className="w-9 h-9 rounded-full bg-[#0F766E] text-white inline-flex items-center justify-center shrink-0 group-hover:bg-[#115E59] transition-colors">
                <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* 4 Trust Guarantees Bar */}
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          {
            icon: CheckCircle2,
            title: 'Tested Quality',
            desc: 'Pet-safe materials & durable stitching',
          },
          {
            icon: Truck,
            title: 'Tracked Shipping',
            desc: 'Free over $39 with email tracking',
          },
          {
            icon: Lock,
            title: 'Secure Checkout',
            desc: '256-bit SSL WooCommerce payments',
          },
          {
            icon: HeartHandshake,
            title: 'Pet Lover Support',
            desc: 'Dedicated sizing & return help',
          },
        ].map((box) => {
          const Icon = box.icon;
          return (
            <div
              key={box.title}
              className="rounded-xl bg-white border border-[#E7E5E4] px-4 py-3.5 flex items-center gap-3.5"
            >
              <div className="w-10 h-10 rounded-xl bg-[#0F766E]/10 text-[#0F766E] flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-[#1C1917] truncate">
                  {box.title}
                </div>
                <div className="text-xs text-[#57534E] truncate">{box.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
