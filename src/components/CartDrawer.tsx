import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Info,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { WOOCOMMERCE_CONFIG } from '../config/woocommerce';
import { buildWooCommerceCheckoutUrl } from '../services/wooCommerceService';
import { CartItem } from '../types/shop';
import { ResilientImage } from './ResilientImage';

interface CartDrawerProps {
  isOpen: boolean;
  items: CartItem[];
  onClose: () => void;
  onUpdateQty: (cartKey: string, delta: number) => void;
  onRemoveItem: (cartKey: string) => void;
  onOpenAccountConfig: () => void;
}

export function CartDrawer({
  isOpen,
  items,
  onClose,
  onUpdateQty,
  onRemoveItem,
  onOpenAccountConfig,
}: CartDrawerProps) {
  const [showCheckoutPreview, setShowCheckoutPreview] = useState(false);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.variation.price * item.quantity, 0),
    [items]
  );

  const threshold = WOOCOMMERCE_CONFIG.FREE_SHIPPING_THRESHOLD;
  const remainingForFreeShipping = Math.max(0, threshold - subtotal);
  const progressPct = Math.min(100, Math.round((subtotal / threshold) * 100));
  const shippingCost =
    items.length === 0 || subtotal >= threshold
      ? 0
      : WOOCOMMERCE_CONFIG.STANDARD_SHIPPING_COST;
  const total = subtotal + shippingCost;

  const checkoutBridge = useMemo(() => buildWooCommerceCheckoutUrl(items), [items]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-[1px]"
        onClick={onClose}
      />

      <aside
        className="relative z-10 w-full max-w-md bg-white h-full shadow-2xl border-l border-[#E7E5E4] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label="Carrello della spesa"
      >
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-[#E7E5E4] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-[#F97316]" />
            <h2 className="font-display text-lg font-bold text-[#1C1917]">
              Il tuo Carrello ({items.reduce((acc, i) => acc + i.quantity, 0)})
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-[#57534E] hover:bg-[#F5F5F4] hover:text-[#1C1917]"
            aria-label="Chiudi carrello"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Free Shipping Progress Bar */}
        <div className="px-6 py-3.5 bg-[#FAFAF9] border-b border-[#E7E5E4] space-y-2">
          <div className="flex items-center justify-between text-xs font-medium">
            {remainingForFreeShipping > 0 ? (
              <span className="text-[#1C1917] flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-[#F97316]" />
                <span>
                  Aggiungi{' '}
                  <strong className="tabular-nums text-[#F97316]">
                    {remainingForFreeShipping.toFixed(2).replace('.', ',')}€
                  </strong>{' '}
                  per la spedizione gratuita
                </span>
              </span>
            ) : (
              <span className="text-[#0D9488] font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Hai sbloccato la spedizione gratuita!</span>
              </span>
            )}
            <span className="text-[#78716C] tabular-nums">{progressPct}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#E7E5E4] overflow-hidden">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                remainingForFreeShipping === 0 ? 'bg-[#0D9488]' : 'bg-[#F97316]'
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {items.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-[#FAFAF9] border border-[#E7E5E4] flex items-center justify-center mx-auto text-[#78716C]">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <h3 className="font-display text-base font-bold text-[#1C1917]">
                Il carrello è vuoto
              </h3>
              <p className="text-sm text-[#57534E] max-w-xs mx-auto">
                Esplora le categorie per cani, gatti e piccoli animali e scopri le offerte del mese.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white text-sm font-semibold transition-colors"
              >
                Continua lo shopping
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.cartKey}
                className="flex gap-3.5 pb-4 border-b border-[#F5F5F4] last:border-b-0"
              >
                <div className="w-20 h-16 rounded-xl overflow-hidden border border-[#E7E5E4] bg-[#FAFAF9] shrink-0">
                  <ResilientImage
                    src={item.product.images[0]}
                    alt={item.product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-[#1C1917] leading-snug line-clamp-2">
                      {item.product.name}
                    </h3>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.cartKey)}
                      className="text-[#78716C] hover:text-[#DC2626] p-1 shrink-0"
                      aria-label={`Rimuovi ${item.product.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="text-xs text-[#57534E]">
                    {item.variation.label} ·{' '}
                    <span className="font-mono text-[#78716C]">
                      ID #{item.variation.variation_id}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="inline-flex items-center rounded-lg border border-[#E7E5E4] bg-[#FAFAF9]">
                      <button
                        type="button"
                        onClick={() => onUpdateQty(item.cartKey, -1)}
                        className="w-7 h-7 flex items-center justify-center text-[#1C1917] hover:bg-[#E7E5E4]/60 rounded-l-lg"
                        aria-label="Riduci quantità"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-7 text-center text-xs font-bold tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateQty(item.cartKey, 1)}
                        className="w-7 h-7 flex items-center justify-center text-[#1C1917] hover:bg-[#E7E5E4]/60 rounded-r-lg"
                        aria-label="Aumenta quantità"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <span className="text-sm font-bold text-[#1C1917] tabular-nums">
                      {(item.variation.price * item.quantity).toFixed(2).replace('.', ',')}€
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}

          {/* WooCommerce Checkout Bridge Preview Panel */}
          {showCheckoutPreview && items.length > 0 && (
            <div className="rounded-2xl border border-[#0D9488]/30 bg-[#0D9488]/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#0D9488] flex items-center gap-1.5">
                  <Info className="w-4 h-4" />
                  Anteprima Passaggio a WooCommerce
                </h4>
                <button
                  type="button"
                  onClick={() => setShowCheckoutPreview(false)}
                  className="text-xs text-[#57534E] hover:text-[#1C1917]"
                >
                  Nascondi
                </button>
              </div>

              <p className="text-xs text-[#1C1917] leading-relaxed">
                Gli articoli selezionati vengono passati al checkout WordPress tramite gli ID
                prodotto/variante WooCommerce:
              </p>

              <ul className="space-y-1 text-xs text-[#57534E]">
                {checkoutBridge.payloadSummary.map((entry, idx) => (
                  <li key={idx} className="flex justify-between gap-2">
                    <span className="truncate">
                      {entry.qty}× {entry.name} ({entry.variationLabel})
                    </span>
                    <span className="font-mono text-[#1C1917] shrink-0">
                      ID {entry.targetId}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="p-2.5 rounded-lg bg-white border border-[#E7E5E4] text-[11px] font-mono text-[#1C1917] break-all">
                {checkoutBridge.url}
              </div>

              {checkoutBridge.isMultiItem && (
                <p className="text-[11px] text-[#57534E] leading-relaxed">
                  Nota: stai inviando più articoli insieme. Assicurati di aver attivato lo
                  snippet WPCode su WordPress per il supporto multi-ID (
                  <button
                    type="button"
                    onClick={onOpenAccountConfig}
                    className="text-[#F97316] font-semibold hover:underline"
                  >
                    vedi snippet PHP
                  </button>
                  ).
                </p>
              )}

              <div className="flex items-center gap-2 pt-1">
                <a
                  href={checkoutBridge.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-bold transition-colors"
                >
                  <span>Apri Checkout su zampaclub.it</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer Totals */}
        {items.length > 0 && (
          <div className="p-6 border-t border-[#E7E5E4] bg-[#FAFAF9] space-y-4">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-[#57534E]">
                <span>Subtotale</span>
                <span className="tabular-nums font-medium text-[#1C1917]">
                  {subtotal.toFixed(2).replace('.', ',')}€
                </span>
              </div>
              <div className="flex justify-between text-[#57534E]">
                <span>Spedizione</span>
                <span className="tabular-nums font-medium text-[#1C1917]">
                  {shippingCost === 0 ? (
                    <span className="text-[#0D9488] font-semibold">Gratuita</span>
                  ) : (
                    `${shippingCost.toFixed(2).replace('.', ',')}€`
                  )}
                </span>
              </div>
              <div className="flex justify-between text-base font-bold text-[#1C1917] pt-2 border-t border-[#E7E5E4]">
                <span>Totale</span>
                <span className="tabular-nums text-lg">
                  {total.toFixed(2).replace('.', ',')}€
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <a
                href={checkoutBridge.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white text-sm font-bold shadow-sm transition-colors"
              >
                <span>Procedi al Pagamento</span>
                <ArrowRight className="w-4 h-4" />
              </a>
              <button
                type="button"
                onClick={() => setShowCheckoutPreview((v) => !v)}
                className="w-full text-center text-xs font-medium text-[#57534E] hover:text-[#1C1917]"
              >
                {showCheckoutPreview
                  ? 'Nascondi anteprima URL WooCommerce'
                  : 'Mostra anteprima URL passaggio WooCommerce'}
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
