import { CheckCircle2, Mail, MapPin, Phone, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { MacroCategorySlug } from '../types/shop';
import { ZampaLogo } from './ZampaLogo';

interface FooterProps {
  onSelectCategory: (slug: MacroCategorySlug) => void;
  onOpenAccount: () => void;
}

export function Footer({ onSelectCategory, onOpenAccount }: FooterProps) {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubscribed(true);
    setEmail('');
  };

  return (
    <footer className="bg-white border-t border-[#E7E5E4] mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8">
          {/* Brand & Newsletter */}
          <div className="lg:col-span-5 space-y-5">
            <ZampaLogo size="md" />
            <p className="text-sm text-[#57534E] leading-relaxed max-w-md">
              La pet boutique italiana dedicata al comfort quotidiano di cani, gatti e piccoli
              animali. Accessori testati, materiali sicuri e tecnologia smart pensata per chi
              ama davvero gli animali.
            </p>

            <div className="rounded-2xl bg-[#FAFAF9] border border-[#E7E5E4] p-5 space-y-3 max-w-md">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display text-base font-bold text-[#1C1917]">
                  10% di sconto sul primo ordine
                </h3>
                <span className="text-xs font-semibold text-[#0D9488]">Newsletter Club</span>
              </div>
              <p className="text-xs text-[#57534E]">
                Ricevi il codice benvenuto e le novità selezionate una volta a settimana. Zero spam.
              </p>

              {subscribed ? (
                <div className="flex items-center gap-2 rounded-xl bg-[#0D9488]/10 border border-[#0D9488]/20 px-3.5 py-2.5 text-sm text-[#0D9488] font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    Iscrizione confermata! Usa il codice{' '}
                    <strong className="font-bold tracking-wide">ZAMPA10</strong> al checkout.
                  </span>
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="flex gap-2">
                  <label htmlFor="footer-newsletter" className="sr-only">
                    Indirizzo email per sconto 10%
                  </label>
                  <input
                    id="footer-newsletter"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="La tua email..."
                    className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl bg-white border border-[#E7E5E4] text-sm text-[#1C1917] placeholder:text-[#78716C] focus:outline-none focus:ring-2 focus:ring-[#F97316]/30 focus:border-[#F97316]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
                  >
                    Ottieni -10%
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Categorie */}
          <div className="lg:col-span-2 space-y-3.5">
            <h3 className="text-sm font-bold text-[#1C1917]">Categorie</h3>
            <ul className="space-y-2.5 text-sm text-[#57534E]">
              <li>
                <button
                  type="button"
                  onClick={() => onSelectCategory('cani')}
                  className="hover:text-[#F97316] transition-colors text-left"
                >
                  Cani
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onSelectCategory('gatti')}
                  className="hover:text-[#F97316] transition-colors text-left"
                >
                  Gatti
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onSelectCategory('viaggio-trasporto')}
                  className="hover:text-[#F97316] transition-colors text-left"
                >
                  Viaggio & Trasporto
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onSelectCategory('cura-toelettatura')}
                  className="hover:text-[#F97316] transition-colors text-left"
                >
                  Cura & Toelettatura
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onSelectCategory('smart-pet-tech')}
                  className="hover:text-[#F97316] transition-colors text-left"
                >
                  Smart Pet Tech
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onSelectCategory('piccoli-animali')}
                  className="hover:text-[#F97316] transition-colors text-left"
                >
                  Piccoli Animali
                </button>
              </li>
            </ul>
          </div>

          {/* Spedizioni e Supporto */}
          <div className="lg:col-span-3 space-y-3.5">
            <h3 className="text-sm font-bold text-[#1C1917]">Spedizioni & Assistenza</h3>
            <ul className="space-y-2.5 text-sm text-[#57534E]">
              <li>Spedizione gratuita da 39€ (4,90€ sotto soglia)</li>
              <li>Consegna tracciata in 4–7 giorni lavorativi</li>
              <li>Reso facile e rimborso entro 30 giorni</li>
              <li>
                <button
                  type="button"
                  onClick={onOpenAccount}
                  className="hover:text-[#F97316] transition-colors text-left font-medium text-[#1C1917]"
                >
                  Stato Integrazione WooCommerce
                </button>
              </li>
            </ul>
            <div className="pt-2 space-y-1.5 text-xs text-[#57534E]">
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-[#0D9488]" />
                <span>ciao@zampaclub.it</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-[#0D9488]" />
                <span>Lun–Ven 9:00–18:00 · Assistenza Pet Lover</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#0D9488]" />
                <span>Milano · Spedizioni in tutta Italia</span>
              </div>
            </div>
          </div>

          {/* Pagamenti Sicuri */}
          <div className="lg:col-span-2 space-y-3.5">
            <h3 className="text-sm font-bold text-[#1C1917]">Pagamenti Sicuri</h3>
            <p className="text-xs text-[#57534E] leading-relaxed">
              Transazioni crittografate SSL tramite checkout WordPress + WooCommerce.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {['VISA', 'Mastercard', 'PayPal', 'Apple Pay', 'Klarna', 'Bonifico'].map((method) => (
                <div
                  key={method}
                  className="px-2.5 py-2 rounded-lg border border-[#E7E5E4] bg-[#FAFAF9] text-center text-xs font-semibold text-[#1C1917]"
                >
                  {method}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#0D9488] font-medium pt-1">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Checkout protetto 256-bit</span>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-[#E7E5E4] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#57534E]">
          <p>© {new Date().getFullYear()} Zampa Club · Pet Boutique & Accessori. Tutti i diritti riservati.</p>
          <div className="flex items-center gap-4">
            <span>Privacy Policy</span>
            <span aria-hidden="true">·</span>
            <span>Termini e Condizioni</span>
            <span aria-hidden="true">·</span>
            <span>Resi & Garanzia</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
