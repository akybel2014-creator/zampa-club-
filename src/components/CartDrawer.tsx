import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { formatUsd, WOOCOMMERCE_CONFIG } from '../config/woocommerce';
import {
  submitWooCommerceCheckout,
  WooCheckoutBilling,
  WooCheckoutResult,
} from '../services/wooCommerceService';
import { CartItem } from '../types/shop';
import { ResilientImage } from './ResilientImage';

interface CartDrawerProps {
  isOpen: boolean;
  items: CartItem[];
  onClose: () => void;
  onUpdateQty: (cartKey: string, delta: number) => void;
  onRemoveItem: (cartKey: string) => void;
  onClearCart: () => void;
}

export function CartDrawer({
  isOpen,
  items,
  onClose,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
}: CartDrawerProps) {
  const [step, setStep] = useState<'cart' | 'checkout' | 'success'>('cart');
  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [orderResult, setOrderResult] = useState<WooCheckoutResult | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'woocommerce_payments'>('cod');
  const [billing, setBilling] = useState<WooCheckoutBilling>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address_1: '',
    city: '',
    postcode: '',
    country: 'US',
    state: '',
  });

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

  useEffect(() => {
    if (isOpen && items.length > 0 && step === 'success') {
      setStep('cart');
      setOrderResult(null);
      setCheckoutError(null);
    }
  }, [isOpen, items.length, step]);

  if (!isOpen) return null;

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setCheckoutError(null);

    const res = await submitWooCommerceCheckout(items, billing, paymentMethod);
    setSubmitting(false);

    if (!res.ok) {
      setCheckoutError(res.error || 'Unable to complete checkout.');
      return;
    }

    setOrderResult(res);
    setStep('success');
    onClearCart();
  };

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
            {step === 'checkout' ? (
              <button
                type="button"
                onClick={() => {
                  setStep('cart');
                  setCheckoutError(null);
                }}
                className="w-10 h-10 -ml-2 rounded-xl flex items-center justify-center text-[#57534E] hover:bg-[#F5F5F4] hover:text-[#1C1917] shrink-0"
                aria-label="Back to cart"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            ) : (
              <ShoppingBag className="w-5 h-5 text-[#C2410C] shrink-0" />
            )}
            <h2 className="font-display text-lg font-bold text-[#1C1917] truncate">
              {step === 'checkout'
                ? 'Express Checkout'
                : step === 'success'
                  ? 'Order Confirmed'
                  : `Your Cart (${items.reduce((acc, i) => acc + i.quantity, 0)})`}
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
        {step !== 'success' && (
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
        )}

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
          {step === 'success' && orderResult ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-[#0F766E]/10 text-[#0F766E] flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="font-display text-xl font-bold text-[#1C1917]">
                  Thank you! Order #{orderResult.orderNumber || orderResult.orderId}
                </h3>
                <p className="text-sm text-[#57534E]">
                  Your order has been registered directly via WooCommerce API (status:{' '}
                  <span className="font-semibold text-[#1C1917]">{orderResult.status}</span>).
                </p>
              </div>

              {orderResult.paymentUrl && (
                <a
                  href={orderResult.paymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#0F766E] hover:bg-[#115E59] text-white text-sm font-bold transition-colors"
                >
                  <span>Complete Payment on WooCommerce</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}

              <button
                type="button"
                onClick={() => {
                  setStep('cart');
                  setOrderResult(null);
                  onClose();
                }}
                className="w-full min-h-[44px] px-5 py-2.5 rounded-xl border border-[#E7E5E4] text-sm font-semibold text-[#1C1917] hover:bg-[#FAFAF9] transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          ) : items.length === 0 ? (
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
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#C2410C] hover:bg-[#9A3412] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9A3412] text-white text-sm font-semibold transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          ) : step === 'checkout' ? (
            <form id="api-checkout-form" onSubmit={handleCheckoutSubmit} className="space-y-4">
              {checkoutError && (
                <div className="rounded-xl border border-[#DC2626]/30 bg-[#DC2626]/5 p-3.5 text-xs text-[#991B1B] flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{checkoutError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#57534E] mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={billing.first_name}
                    onChange={(e) =>
                      setBilling((b) => ({ ...b, first_name: e.target.value }))
                    }
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-[#E7E5E4] text-base sm:text-sm text-[#1C1917] focus:outline-none focus:border-[#C2410C]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#57534E] mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={billing.last_name}
                    onChange={(e) =>
                      setBilling((b) => ({ ...b, last_name: e.target.value }))
                    }
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-[#E7E5E4] text-base sm:text-sm text-[#1C1917] focus:outline-none focus:border-[#C2410C]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#57534E] mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={billing.email}
                    onChange={(e) =>
                      setBilling((b) => ({ ...b, email: e.target.value }))
                    }
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-[#E7E5E4] text-base sm:text-sm text-[#1C1917] focus:outline-none focus:border-[#C2410C]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#57534E] mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={billing.phone}
                    onChange={(e) =>
                      setBilling((b) => ({ ...b, phone: e.target.value }))
                    }
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-[#E7E5E4] text-base sm:text-sm text-[#1C1917] focus:outline-none focus:border-[#C2410C]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#57534E] mb-1">
                  Street Address *
                </label>
                <input
                  type="text"
                  required
                  value={billing.address_1}
                  onChange={(e) =>
                    setBilling((b) => ({ ...b, address_1: e.target.value }))
                  }
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-[#E7E5E4] text-base sm:text-sm text-[#1C1917] focus:outline-none focus:border-[#C2410C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#57534E] mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={billing.city}
                    onChange={(e) =>
                      setBilling((b) => ({ ...b, city: e.target.value }))
                    }
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-[#E7E5E4] text-base sm:text-sm text-[#1C1917] focus:outline-none focus:border-[#C2410C]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#57534E] mb-1">
                    Postal Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={billing.postcode}
                    onChange={(e) =>
                      setBilling((b) => ({ ...b, postcode: e.target.value }))
                    }
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-[#E7E5E4] text-base sm:text-sm text-[#1C1917] focus:outline-none focus:border-[#C2410C]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#57534E] mb-1">
                    Country *
                  </label>
                  <select
                    value={billing.country}
                    onChange={(e) =>
                      setBilling((b) => ({ ...b, country: e.target.value }))
                    }
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-[#E7E5E4] bg-white text-base sm:text-sm text-[#1C1917] focus:outline-none focus:border-[#C2410C]"
                  >
                    <option value="US">United States (US)</option>
                    <option value="IT">Italy (IT)</option>
                    <option value="GB">United Kingdom (GB)</option>
                    <option value="CA">Canada (CA)</option>
                    <option value="DE">Germany (DE)</option>
                    <option value="FR">France (FR)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#57534E] mb-1">
                    State / Province
                  </label>
                  <input
                    type="text"
                    value={billing.state}
                    onChange={(e) =>
                      setBilling((b) => ({ ...b, state: e.target.value }))
                    }
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-[#E7E5E4] text-base sm:text-sm text-[#1C1917] focus:outline-none focus:border-[#C2410C]"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <span className="block text-xs font-semibold text-[#57534E]">
                  Payment Method
                </span>
                <div className="grid grid-cols-1 gap-2">
                  <label
                    className={`min-h-[44px] flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border cursor-pointer text-sm font-medium ${
                      paymentMethod === 'cod'
                        ? 'border-[#C2410C] bg-[#C2410C]/5 text-[#1C1917]'
                        : 'border-[#E7E5E4] text-[#57534E]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      checked={paymentMethod === 'cod'}
                      onChange={() => setPaymentMethod('cod')}
                      className="accent-[#C2410C]"
                    />
                    <span>Cash on Delivery (Instant Order API)</span>
                  </label>
                  <label
                    className={`min-h-[44px] flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border cursor-pointer text-sm font-medium ${
                      paymentMethod === 'woocommerce_payments'
                        ? 'border-[#C2410C] bg-[#C2410C]/5 text-[#1C1917]'
                        : 'border-[#E7E5E4] text-[#57534E]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      checked={paymentMethod === 'woocommerce_payments'}
                      onChange={() => setPaymentMethod('woocommerce_payments')}
                      className="accent-[#C2410C]"
                    />
                    <span>Card / Online Payment (WooCommerce)</span>
                  </label>
                </div>
              </div>
            </form>
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
        </div>

        {/* Drawer Footer Totals */}
        {items.length > 0 && step !== 'success' && (
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

            {step === 'cart' ? (
              <button
                type="button"
                onClick={() => {
                  setCheckoutError(null);
                  setStep('checkout');
                }}
                className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#C2410C] hover:bg-[#9A3412] active:bg-[#9A3412] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9A3412] text-white text-sm font-bold shadow-sm transition-colors"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                form="api-checkout-form"
                disabled={submitting}
                className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#C2410C] hover:bg-[#9A3412] disabled:opacity-60 text-white text-sm font-bold shadow-sm transition-colors"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting Order...</span>
                  </>
                ) : (
                  <>
                    <span>Place Order · {formatUsd(total)}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
