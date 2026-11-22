import { Award, CheckCircle2, ShieldCheck, Star, Truck } from 'lucide-react';
import { VERIFIED_REVIEWS } from '../data/mockProducts';

export function WhyZampaAndReviews() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      {/* Perché scegliere Zampa Club */}
      <div className="rounded-2xl bg-white border border-[#E7E5E4] p-6 sm:p-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-[#0D9488]">
              Il Metodo Zampa Club
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#1C1917] tracking-tight text-balance">
              Perché scegliere Zampa Club per il tuo animale
            </h2>
            <p className="text-sm sm:text-base text-[#57534E] leading-relaxed">
              Non siamo un elenco infinito di oggetti tutti uguali: selezioniamo solo
              accessori provati nella vita reale, con materiali durevoli e sicuri per chi
              vive in casa con noi.
            </p>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                icon: Award,
                title: 'Selezione curata da Pet Lover',
                body: 'Ogni cuccia, pettorina e dispositivo tech viene valutato per ergonomia, sicurezza dei materiali e facilità di pulizia.',
              },
              {
                icon: Truck,
                title: 'Ordini tracciati e trasparenti',
                body: 'Spedizione gratuita sopra i 39€ con codice di monitoraggio inviato via email fino alla consegna.',
              },
              {
                icon: ShieldCheck,
                title: 'Garanzia di reso 30 giorni',
                body: 'Taglia sbagliata o cambio idea? Il nostro supporto italiano gestisce sostituzioni e resi in modo semplice.',
              },
              {
                icon: CheckCircle2,
                title: 'Varianti chiare su misura',
                body: 'Guide taglie reali e varianti colore pronte al checkout WooCommerce senza sorprese.',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-xl bg-[#FAFAF9] border border-[#E7E5E4] p-4 space-y-1.5"
                >
                  <div className="flex items-center gap-2 text-[#1C1917] font-bold text-sm">
                    <Icon className="w-4 h-4 text-[#F97316] shrink-0" />
                    <span>{item.title}</span>
                  </div>
                  <p className="text-xs text-[#57534E] leading-relaxed">{item.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recensioni Verificate */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-6">
          <div>
            <h2 className="font-display text-2xl font-bold text-[#1C1917] tracking-tight">
              Cosa dicono i proprietari di cani e gatti
            </h2>
            <p className="text-sm text-[#57534E] mt-0.5">
              Valutazione media <strong className="text-[#1C1917] tabular-nums">4,9 / 5</strong>{' '}
              su oltre 1.200 acquisti verificati
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
                  <div className="flex items-center gap-0.5" aria-label={`${rev.rating} su 5 stelle`}>
                    {Array.from({ length: rev.rating }).map((_, idx) => (
                      <Star
                        key={idx}
                        className="w-4 h-4 fill-[#F97316] text-[#F97316]"
                      />
                    ))}
                  </div>
                  <span className="text-xs font-medium text-[#0D9488] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Acquisto verificato
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
                  Con {rev.petName} ({rev.petType}) · {rev.productPurchased}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
