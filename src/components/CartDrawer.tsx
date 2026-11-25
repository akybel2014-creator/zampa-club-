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
import { useEffect, useMemo, useState } from 'react';
import { formatUsd, WOOCOMMERCE_CONFIG } from '../config/woocommerce';
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

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-[1px]"
        onClick={onClose}
      />

      <aside
        className="relative z-10 w-full max-w-md bg-white h-[100dvh] shadow-2xl border-l border-[#E7E5E4] flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Shopping Cart"
      >
        {/* Drawer Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[#E7E5E4] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <ShoppingBag className="w-5 h-5 text-[#C2410C] shrink-0" />
            <h2 className="font-display text-lg font-bold text-[#1C1917] truncate">
              Your Cart ({items.reduce((acc, i) => acc + i.quantity, 0)})
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-[#57534E] hover:bg-[#F5F5F4] hover:text-[#1C1917] shrink-0"
            aria-label="Close cart"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Free Shipping Progress Bar */}
        <div className="px-4 sm:px-6 py-3.5 bg-[#FAFAF9] border-b border-[#E7E5E4] space-y-2 shrink-0">
          <div className="flex items-center justify-between gap-2 text-xs font-medium">
            {remainingForFreeShipping > 0 ? (
              <span className="text-[#1C1917] flex items-center gap-1.5 min-w-0">
                <Truck className="w-4 h-4 text-[#C2410C] shrink-0" />
                <span>
                  Add{' '}
                  <strong className="tabular-nums text-[#C2410C]">
                    {formatUsd(remainingForFreeShipping)}
                  </strong>{' '}
                  more for free shipping
                </span>
              </span>
            ) : (
              <span className="text-[#0F766E] font-semibold flex items-center gap-1.5 min-w-0">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>You&apos;ve unlocked free shipping!</span>
              </span>
            )}
            <span className="text-[#78716C] tabular-nums shrink-0">{progressPct}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#E7E5E4] overflow-hidden">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                remainingForFreeShipping === 0 ? 'bg-[#0F766E]' : 'bg-[#C2410C]'
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
          {items.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-[#FAFAF9] border border-[#E7E5E4] flex items-center justify-center mx-auto text-[#78716C]">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <h3 className="font-display text-base font-bold text-[#1C1917]">
                Your cart is empty
              </h3>
              <p className="text-sm text-[#57534E] max-w-xs mx-auto">
                Explore curated gear for dogs, cats, and small pets to get started.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-[#C2410C] hover:bg-[#9A3412] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9A3412] text-white text-sm font-semibold transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            items.map((item) => {
              const effectiveId =
                item.product.hasVariations !== false &&
                item.variation?.variation_id &&
                item.variation.variation_id !== item.product.id
                  ? item.variation.variation_id
                  : item.product.id;

              return (
                <div
                  key={item.cartKey}
                  className="flex gap-3.5 pb-4 border-b border-[#F5F5F4] last:border-b-0"
                >
                  <div className="w-16 h-16 aspect-square rounded-xl overflow-hidden border border-[#E7E5E4] bg-white p-1 shrink-0">
                    <ResilientImage
                      src={item.product.images[0]}
                      alt={item.product.name}
                      loading="lazy"
                      decoding="async"
                      width={64}
                      height={64}
                      className="w-full h-full object-contain"
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
                        className="w-10 h-10 -mr-2 -mt-1 flex items-center justify-center rounded-lg text-[#78716C] hover:text-[#DC2626] hover:bg-[#F5F5F4] shrink-0"
                        aria-label={`Remove ${item.product.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="text-xs text-[#57534E]">
                      {item.variation.label} ·{' '}
                      <span className="font-mono text-[#78716C]">
                        ID #{effectiveId}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1.5">
                      <div className="inline-flex items-center rounded-xl border border-[#E7E5E4] bg-[#FAFAF9]">
                        <button
                          type="button"
                          onClick={() => onUpdateQty(item.cartKey, -1)}
                          className="w-10 h-10 flex items-center justify-center text-[#1C1917] hover:bg-[#E7E5E4]/60 rounded-l-xl"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-8 text-center text-xs font-bold tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQty(item.cartKey, 1)}
                          className="w-10 h-10 flex items-center justify-center text-[#1C1917] hover:bg-[#E7E5E4]/60 rounded-r-xl"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <span className="text-sm font-bold text-[#1C1917] tabular-nums">
                        {formatUsd(item.variation.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* WooCommerce Checkout Bridge Preview Panel */}
          {showCheckoutPreview && items.length > 0 && (
            <div className="rounded-2xl border border-[#0F766E]/30 bg-[#0F766E]/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#115E59] flex items-center gap-1.5">
                  <Info className="w-4 h-4" />
                  WooCommerce Checkout Bridge Preview
                </h4>
                <button
                  type="button"
                  onClick={() => setShowCheckoutPreview(false)}
                  className="min-h-[36px] px-2 py-1 text-xs font-medium text-[#57534E] hover:text-[#1C1917]"
                >
                  Hide
                </button>
              </div>

              <p className="text-xs text-[#1C1917] leading-relaxed">
                Selected items are forwarded to the WooCommerce checkout using their
                product or variation IDs and quantities:
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
                  Note: sending multiple items together requires the WPCode multi-ID
                  snippet active on WordPress (
                  <button
                    type="button"
                    onClick={onOpenAccountConfig}
                    className="text-[#C2410C] font-semibold hover:underline"
                  >
                    view PHP snippet
                  </button>
                  ).
                </p>
              )}

              <div className="flex items-center gap-2 pt-1">
                <a
                  href={checkoutBridge.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-bold transition-colors"
                >
                  <span>Open WooCommerce Checkout</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer Totals */}
        {items.length > 0 && (
          <div className="p-4 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] border-t border-[#E7E5E4] bg-[#FAFAF9] space-y-3.5 shrink-0">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-[#57534E]">
                <span>Subtotal</span>
                <span className="tabular-nums font-medium text-[#1C1917]">
                  {formatUsd(subtotal)}
                </span>
              </div>
              <div className="flex justify-between text-[#57534E]">
                <span>Shipping</span>
                <span className="tabular-nums font-medium text-[#1C1917]">
                  {shippingCost === 0 ? (
                    <span className="text-[#0F766E] font-semibold">Free</span>
                  ) : (
                    formatUsd(shippingCost)
                  )}
                </span>
              </div>
              <div className="flex justify-between text-base font-bold text-[#1C1917] pt-2 border-t border-[#E7E5E4]">
                <span>Total</span>
                <span className="tabular-nums text-lg">{formatUsd(total)}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <a
                href={checkoutBridge.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#C2410C] hover:bg-[#9A3412] active:bg-[#9A3412] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9A3412] text-white text-sm font-bold shadow-sm transition-colors"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </a>
              <button
                type="button"
                onClick={() => setShowCheckoutPreview((v) => !v)}
                className="w-full min-h-[40px] py-2 text-center text-xs font-medium text-[#57534E] hover:text-[#1C1917]"
              >
                {showCheckoutPreview
                  ? 'Hide WooCommerce checkout URL preview'
                  : 'Show WooCommerce checkout URL preview'}
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
