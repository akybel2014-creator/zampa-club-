import { ArrowRight, CheckCircle2, HeartHandshake, Lock, Truck } from 'lucide-react';
import { HERO_ASSETS } from '../data/mockProducts';
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
            alt="Cane Golden Retriever e gatto tigrato felici sul divano di casa"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/15"
            aria-hidden="true"
          />

          <div className="relative z-10 p-6 sm:p-10 max-w-2xl space-y-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#FDBA74]">
              Pet Boutique · Selezione Cura & Comfort
            </div>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-[42px] font-bold text-white leading-[1.12] tracking-tight text-balance">
              Tutto il meglio per rendere felice il tuo amico a 4 zampe
            </h1>
            <p className="text-sm sm:text-base text-[#E7E5E4] leading-relaxed max-w-xl">
              Cucce ortopediche, accessori da passeggio, tiragraffi di design e dispositivi
              smart testati da proprietari di cani e gatti in tutta Italia.
            </p>
            <div className="pt-1 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onExploreBestSellers}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white text-sm font-semibold shadow-sm transition-colors whitespace-nowrap"
              >
                <span>Scopri i Best Seller</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onSelectCategory('offerte')}
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white text-sm font-semibold border border-white/25 transition-colors whitespace-nowrap"
              >
                Offerte del Mese
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: 2 Dedicated Promo Cards (Speciale Cani & Speciale Gatti) */}
        <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-5">
          {/* Speciale Cani */}
          <button
            type="button"
            onClick={() => onSelectCategory('cani')}
            className="group relative rounded-2xl overflow-hidden border border-[#E7E5E4] bg-white text-left min-h-[205px] flex items-end transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md"
          >
            <ResilientImage
              src={HERO_ASSETS.promoDogs}
              alt="Bulldog francese con pettorina arancione"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"
              aria-hidden="true"
            />
            <div className="relative z-10 p-5 w-full flex items-end justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[#FDBA74]">
                  Collezione Passeggio & Riposo
                </div>
                <h2 className="font-display text-xl font-bold text-white mt-0.5">
                  Speciale Cani
                </h2>
                <p className="text-xs text-[#E7E5E4] mt-0.5">
                  Pettorine anti-tiro e cucce memory foam
                </p>
              </div>
              <span className="w-9 h-9 rounded-full bg-[#F97316] text-white inline-flex items-center justify-center shrink-0 group-hover:bg-[#EA580C] transition-colors">
                <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </button>

          {/* Speciale Gatti */}
          <button
            type="button"
            onClick={() => onSelectCategory('gatti')}
            className="group relative rounded-2xl overflow-hidden border border-[#E7E5E4] bg-white text-left min-h-[205px] flex items-end transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md"
          >
            <ResilientImage
              src={HERO_ASSETS.promoCats}
              alt="Gatto British Shorthair su tiragraffi in legno di betulla"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"
              aria-hidden="true"
            />
            <div className="relative z-10 p-5 w-full flex items-end justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[#5EEAD4]">
                  Tiragraffi & Fontanelle
                </div>
                <h2 className="font-display text-xl font-bold text-white mt-0.5">
                  Speciale Gatti
                </h2>
                <p className="text-xs text-[#E7E5E4] mt-0.5">
                  Design nordico e idratazione silenziosa
                </p>
              </div>
              <span className="w-9 h-9 rounded-full bg-[#0D9488] text-white inline-flex items-center justify-center shrink-0 group-hover:bg-[#0F766E] transition-colors">
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
            title: 'Qualità Testata',
            desc: 'Materiali atossici e cuciture verificate',
          },
          {
            icon: Truck,
            title: 'Spedizione Tracciata',
            desc: 'Gratis da 39€ con tracking via email',
          },
          {
            icon: Lock,
            title: 'Pagamenti Sicuri',
            desc: 'Checkout SSL WordPress & WooCommerce',
          },
          {
            icon: HeartHandshake,
            title: 'Assistenza Pet Lover',
            desc: 'Supporto dedicato per taglie e resi',
          },
        ].map((box) => {
          const Icon = box.icon;
          return (
            <div
              key={box.title}
              className="rounded-xl bg-white border border-[#E7E5E4] px-4 py-3.5 flex items-center gap-3.5"
            >
              <div className="w-10 h-10 rounded-xl bg-[#0D9488]/10 text-[#0D9488] flex items-center justify-center shrink-0">
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
