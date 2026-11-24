import { Check, Minus, Plus, ShieldCheck, ShoppingBag, Star, Truck, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatUsd } from '../config/woocommerce';
import { fetchProductVariations } from '../services/wooCommerceService';
import { Product, ProductVariation } from '../types/shop';
import { ResilientImage } from './ResilientImage';

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product, variation: ProductVariation, quantity: number) => void;
}

export function ProductModal({
  product,
  onClose,
  onAddToCart,
}: ProductModalProps) {
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [selectedVariationId, setSelectedVariationId] = useState<number | null>(null);
  const [liveVariations, setLiveVariations] = useState<ProductVariation[] | null>(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!product) {
      setLiveVariations(null);
      return;
    }

    setSelectedImageIdx(0);
    setSelectedVariationId(product.default_variation_id);
    setLiveVariations(null);
    setQuantity(1);

    if (!product.hasVariations) return;

    let active = true;
    fetchProductVariations(product.id, product.price, product.regular_price).then(
      (vars) => {
        if (!active || !vars || vars.length === 0) return;
        setLiveVariations(vars);
        setSelectedVariationId(vars[0].variation_id);
      }
    );
    return () => {
      active = false;
    };
  }, [product]);

  if (!product) return null;

  const variations = liveVariations || product.variations;
  const activeVariation =
    variations.find((v) => v.variation_id === selectedVariationId) ||
    variations[0];

  const activePrice = activeVariation?.price ?? product.price;
  const activeRegular = activeVariation?.regular_price ?? product.regular_price;
  const discountPercent =
    activeRegular && activeRegular > activePrice
      ? Math.round(((activeRegular - activePrice) / activeRegular) * 100)
      : 0;

  const handleConfirmAdd = () => {
    onAddToCart(product, activeVariation, quantity);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-3 sm:p-6 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdp-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl rounded-2xl bg-white border border-[#E7E5E4] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Modal Bar */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-[#E7E5E4] bg-[#FAFAF9]">
          <div className="text-xs font-medium text-[#57534E] truncate">
            {product.categoryLabel}
            {product.subcategories[0] ? ` / ${product.subcategories[0]}` : ''} · SKU{' '}
            <span className="font-mono text-[#1C1917]">{activeVariation.sku}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-[#57534E] hover:bg-[#E7E5E4]/60 hover:text-[#1C1917] transition-colors shrink-0"
            aria-label="Close product details"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto p-5 sm:p-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            {/* Gallery Left */}
            <div className="md:col-span-6 space-y-3 md:sticky md:top-0">
              <div className="aspect-square rounded-2xl overflow-hidden border border-[#E7E5E4] bg-white p-4 relative flex items-center justify-center">
                <ResilientImage
                  src={product.images[selectedImageIdx] || product.images[0]}
                  alt={product.name}
                  loading="lazy"
                  decoding="async"
                  width={600}
                  height={600}
                  className="w-full h-full object-contain object-center"
                />
                {discountPercent > 0 && (
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-[#F97316] text-white text-xs font-bold tabular-nums">
                    Save {discountPercent}%
                  </span>
                )}
              </div>

              {product.images.length > 1 && (
                <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                  {product.images.map((img, idx) => (
                    <button
                      key={img + idx}
                      type="button"
                      onClick={() => setSelectedImageIdx(idx)}
                      className={`w-16 h-16 aspect-square shrink-0 rounded-xl overflow-hidden border-2 bg-white p-1 transition-all ${
                        selectedImageIdx === idx
                          ? 'border-[#F97316] shadow-sm'
                          : 'border-[#E7E5E4] opacity-75 hover:opacity-100'
                      }`}
                    >
                      <ResilientImage
                        src={img}
                        alt={`${product.name} view ${idx + 1}`}
                        loading="lazy"
                        decoding="async"
                        width={64}
                        height={64}
                        className="w-full h-full object-contain"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Contiguous Purchase Module Right */}
            <div className="md:col-span-6 space-y-5">
              <div>
                <div className="flex items-center justify-between gap-2 text-xs text-[#57534E]">
                  <span className="font-semibold uppercase tracking-wider text-[#0D9488]">
                    {product.brand}
                  </span>
                  <span className="inline-flex items-center gap-1 font-semibold text-[#1C1917] tabular-nums">
                    <Star className="w-3.5 h-3.5 fill-[#F97316] text-[#F97316]" />
                    {product.rating.toFixed(1)} · {product.reviews_count} reviews
                  </span>
                </div>

                <h2
                  id="pdp-modal-title"
                  className="font-display text-2xl font-bold text-[#1C1917] mt-1.5 leading-tight"
                >
                  {product.name}
                </h2>

                <div className="mt-3 flex items-baseline gap-3">
                  <span className="text-3xl font-bold text-[#1C1917] tabular-nums">
                    {formatUsd(activePrice)}
                  </span>
                  {activeRegular && (
                    <span className="text-base text-[#78716C] line-through tabular-nums">
                      {formatUsd(activeRegular)}
                    </span>
                  )}
                  <span className="text-xs font-semibold text-[#0D9488] flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    In Stock
                  </span>
                </div>
              </div>

              <p className="text-sm text-[#57534E] leading-relaxed">
                {product.description}
              </p>

              {/* Variation Selector */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#1C1917] uppercase tracking-wider">
                    Select Option (Size / Color)
                  </span>
                  <span className="text-[#78716C] font-mono">
                    {product.hasVariations !== false && activeVariation.variation_id !== product.id
                      ? `Variation #${activeVariation.variation_id}`
                      : `Product #${product.id}`}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {variations.map((v) => {
                    const selected = v.variation_id === activeVariation.variation_id;
                    return (
                      <button
                        key={v.variation_id}
                        type="button"
                        onClick={() => setSelectedVariationId(v.variation_id)}
                        className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-left transition-all ${
                          selected
                            ? 'border-[#F97316] bg-[#F97316]/5 ring-1 ring-[#F97316]'
                            : 'border-[#E7E5E4] bg-white hover:border-[#D6D3D1]'
                        }`}
                      >
                        <span className="flex items-center gap-2.5 min-w-0">
                          {v.colorHex && (
                            <span
                              className="w-4 h-4 rounded-full border border-black/15 shrink-0"
                              style={{ backgroundColor: v.colorHex }}
                              aria-hidden="true"
                            />
                          )}
                          <span className="text-sm font-semibold text-[#1C1917] truncate">
                            {v.label}
                          </span>
                        </span>
                        <span className="text-sm font-bold text-[#1C1917] tabular-nums shrink-0 ml-3">
                          {formatUsd(v.price)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quantity & CTA */}
              <div className="flex items-center gap-3 pt-2">
                <div className="inline-flex items-center rounded-xl border border-[#E7E5E4] bg-[#FAFAF9]">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-10 h-11 flex items-center justify-center text-[#1C1917] hover:bg-[#E7E5E4]/50 rounded-l-xl"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-10 text-center text-sm font-bold tabular-nums">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-10 h-11 flex items-center justify-center text-[#1C1917] hover:bg-[#E7E5E4]/50 rounded-r-xl"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleConfirmAdd}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white text-sm font-bold shadow-sm transition-colors"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>
                    Add to Cart · {formatUsd(activePrice * quantity)}
                  </span>
                </button>
              </div>

              {/* Specs Table */}
              <div className="border-t border-[#E7E5E4] pt-4 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#78716C]">
                  Product Details
                </h3>
                <dl className="divide-y divide-[#F5F5F4] text-xs">
                  {product.specs.map((spec) => (
                    <div key={spec.label} className="py-2 flex justify-between gap-4">
                      <dt className="text-[#57534E] font-medium">{spec.label}</dt>
                      <dd className="text-[#1C1917] font-semibold text-right">{spec.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-[#57534E] pt-1">
                <span className="inline-flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-[#0D9488]" />
                  Free shipping over $39
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#0D9488]" />
                  30-day easy returns
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
