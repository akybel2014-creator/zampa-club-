import { Check, ShoppingBag, Star } from 'lucide-react';
import { useState } from 'react';
import { formatUsd } from '../config/woocommerce';
import { Product } from '../types/shop';
import { ResilientImage } from './ResilientImage';

interface ProductCardProps {
  product: Product;
  onOpenProduct: (product: Product) => void;
  onQuickAdd: (product: Product) => void;
}

export function ProductCard({
  product,
  onOpenProduct,
  onQuickAdd,
}: ProductCardProps) {
  const [justAdded, setJustAdded] = useState(false);

  const discountPercent =
    product.regular_price && product.regular_price > product.price
      ? Math.round(
          ((product.regular_price - product.price) / product.regular_price) * 100
        )
      : 0;

  const handleQuickAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onQuickAdd(product);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1400);
  };

  return (
    <article className="group rounded-2xl bg-white border border-[#E7E5E4] overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      {/* Product Photo (1:1 square, uncropped studio container) */}
      <button
        type="button"
        onClick={() => onOpenProduct(product)}
        className="relative aspect-square w-full bg-white p-3 border-b border-[#F5F5F4] overflow-hidden flex items-center justify-center text-left focus-visible:outline-2 focus-visible:outline-[#F97316]"
      >
        <ResilientImage
          src={product.images[0]}
          alt={product.name}
          loading="lazy"
          decoding="async"
          width={400}
          height={400}
          className="w-full h-full object-contain object-center transition-transform duration-300 group-hover:scale-[1.03]"
        />
        {discountPercent > 0 && (
          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-[#F97316] text-white text-xs font-bold tabular-nums shadow-sm">
            -{discountPercent}%
          </span>
        )}
      </button>

      {/* Card Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col">
        <div className="flex items-center justify-between gap-2 text-xs text-[#57534E]">
          <span className="uppercase tracking-wider font-semibold text-[#78716C] truncate">
            {product.categoryLabel}
          </span>
          <span className="inline-flex items-center gap-1 text-[#1C1917] font-semibold tabular-nums shrink-0">
            <Star className="w-3.5 h-3.5 fill-[#F97316] text-[#F97316]" />
            <span>{product.rating.toFixed(1)}</span>
            <span className="text-[#78716C] font-normal">({product.reviews_count})</span>
          </span>
        </div>

        <button
          type="button"
          onClick={() => onOpenProduct(product)}
          className="mt-1.5 text-left"
        >
          <h3 className="font-display text-base font-bold text-[#1C1917] group-hover:text-[#F97316] transition-colors line-clamp-2 leading-snug">
            {product.name}
          </h3>
        </button>

        <p className="mt-1.5 text-xs text-[#57534E] line-clamp-2 leading-relaxed">
          {product.short_description}
        </p>

        <div className="mt-2.5 text-xs text-[#78716C]">
          {product.variations.length > 1
            ? `${product.variations.length} options available`
            : product.variations[0]?.label}
        </div>

        {/* Baseline-aligned Price & Quick Add */}
        <div className="mt-auto pt-4 flex items-center justify-between gap-3 border-t border-[#F5F5F4]">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-[#1C1917] tabular-nums">
              {formatUsd(product.price)}
            </span>
            {product.regular_price && (
              <span className="text-xs text-[#78716C] line-through tabular-nums">
                {formatUsd(product.regular_price)}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleQuickAddClick}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              justAdded
                ? 'bg-[#0D9488] text-white'
                : 'bg-[#F97316] hover:bg-[#EA580C] text-white'
            }`}
          >
            {justAdded ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Added</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Add to Cart</span>
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
