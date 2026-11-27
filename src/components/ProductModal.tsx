import {
  Check,
  CheckCircle2,
  Loader2,
  MessageSquarePlus,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Star,
  Truck,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { formatUsd } from '../config/woocommerce';
import { useAuth } from '../context/AuthContext';
import {
  fetchProductReviews,
  fetchProductVariations,
  ProductReviewItem,
  submitProductReview,
} from '../services/wooCommerceService';
import { Product, ProductVariation } from '../types/shop';
import { ResilientImage } from './ResilientImage';

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product, variation: ProductVariation, quantity: number) => void;
  onRequireAuthForReview: (product: Product) => void;
  reviewFocusSignal?: number;
}

export function ProductModal({
  product,
  onClose,
  onAddToCart,
  onRequireAuthForReview,
  reviewFocusSignal = 0,
}: ProductModalProps) {
  const { isAuthenticated, sessionToken, user } = useAuth();

  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [selectedVariationId, setSelectedVariationId] = useState<number | null>(null);
  const [liveVariations, setLiveVariations] = useState<ProductVariation[] | null>(null);
  const [quantity, setQuantity] = useState(1);

  const [reviews, setReviews] = useState<ProductReviewItem[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);

  const reviewsSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!product) {
      setLiveVariations(null);
      setReviews([]);
      setShowReviewForm(false);
      setReviewError(null);
      setReviewSuccess(null);
      return;
    }

    setSelectedImageIdx(0);
    setSelectedVariationId(product.default_variation_id);
    setLiveVariations(null);
    setQuantity(1);
    setShowReviewForm(false);
    setReviewRating(5);
    setReviewText('');
    setReviewError(null);
    setReviewSuccess(null);

    let active = true;
    setLoadingReviews(true);
    fetchProductReviews(product.id).then((items) => {
      if (!active) return;
      setReviews(items);
      setLoadingReviews(false);
    });

    if (!product.hasVariations) {
      return () => {
        active = false;
      };
    }

    const alreadyResolvedVariations =
      product.variations.length > 0 &&
      product.variations.every((v) => v.variation_id !== product.id);
    if (alreadyResolvedVariations) {
      return () => {
        active = false;
      };
    }

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

  useEffect(() => {
    if (!product || reviewFocusSignal <= 0) return;
    setShowReviewForm(true);
    setReviewError(null);
    const timerId = window.setTimeout(() => {
      reviewsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
    return () => window.clearTimeout(timerId);
  }, [product, reviewFocusSignal]);

  useEffect(() => {
    if (!product) return;
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
  }, [product, onClose]);

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

  const handleWriteReviewClick = () => {
    if (!isAuthenticated) {
      onRequireAuthForReview(product);
      return;
    }
    setReviewError(null);
    setReviewSuccess(null);
    setShowReviewForm((prev) => !prev);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      onRequireAuthForReview(product);
      return;
    }

    setReviewError(null);
    setReviewSuccess(null);
    setSubmittingReview(true);

    const res = await submitProductReview(
      product.id,
      { rating: reviewRating, review: reviewText.trim() },
      sessionToken
    );

    setSubmittingReview(false);

    if (res.requiresAuth) {
      onRequireAuthForReview(product);
      return;
    }

    if (!res.ok || !res.review) {
      setReviewError(res.error || 'Unable to submit your review right now.');
      return;
    }

    setReviews((prev) => [res.review!, ...prev]);
    setReviewText('');
    setReviewRating(5);
    setShowReviewForm(false);
    setReviewSuccess('Thank you! Your review has been submitted.');
  };

  const totalReviewCount = Math.max(product.reviews_count, reviews.length);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-3 sm:p-6 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdp-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl rounded-2xl bg-white border border-[#E7E5E4] shadow-2xl overflow-hidden max-h-[92dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Modal Bar */}
        <div className="flex items-center justify-between gap-2 px-4 sm:px-6 py-3 border-b border-[#E7E5E4] bg-[#FAFAF9] shrink-0">
          <div className="text-xs font-medium text-[#57534E] truncate">
            {product.categoryLabel}
            {product.subcategories[0] ? ` / ${product.subcategories[0]}` : ''} · SKU{' '}
            <span className="font-mono text-[#1C1917]">{activeVariation.sku}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-[#57534E] hover:bg-[#E7E5E4]/60 hover:text-[#1C1917] transition-colors shrink-0"
            aria-label="Close product details"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto overscroll-contain p-4 sm:p-8 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
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
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-[#C2410C] text-white text-xs font-bold tabular-nums">
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
                          ? 'border-[#C2410C] shadow-sm'
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
                  <span className="font-semibold uppercase tracking-wider text-[#0F766E]">
                    {product.brand}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      reviewsSectionRef.current?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start',
                      })
                    }
                    className="inline-flex items-center gap-1 font-semibold text-[#1C1917] hover:text-[#C2410C] tabular-nums transition-colors"
                  >
                    <Star className="w-3.5 h-3.5 fill-[#C2410C] text-[#C2410C]" aria-hidden="true" />
                    {product.rating.toFixed(1)} · {totalReviewCount} reviews
                  </button>
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
                  <span className="text-xs font-semibold text-[#0F766E] flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" aria-hidden="true" />
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
                        className={`min-h-[44px] flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-left transition-all ${
                          selected
                            ? 'border-[#C2410C] bg-[#C2410C]/5 ring-1 ring-[#C2410C]'
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
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 sm:gap-3 pt-2">
                <div className="inline-flex items-center rounded-xl border border-[#E7E5E4] bg-[#FAFAF9]">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-11 h-11 flex items-center justify-center text-[#1C1917] hover:bg-[#E7E5E4]/50 rounded-l-xl"
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
                    className="w-11 h-11 flex items-center justify-center text-[#1C1917] hover:bg-[#E7E5E4]/50 rounded-r-xl"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleConfirmAdd}
                  className="flex-1 min-w-[180px] min-h-[48px] inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-3 rounded-xl bg-[#C2410C] hover:bg-[#9A3412] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9A3412] text-white text-sm font-bold shadow-sm transition-colors whitespace-nowrap"
                >
                  <ShoppingBag className="w-4 h-4 shrink-0" />
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
                  <Truck className="w-4 h-4 text-[#0F766E]" />
                  Free shipping over $39
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#0F766E]" />
                  30-day easy returns
                </span>
              </div>
            </div>
          </div>

          {/* Customer Reviews Section */}
          <div
            id="product-reviews-section"
            ref={reviewsSectionRef}
            className="mt-8 pt-6 border-t border-[#E7E5E4] space-y-4 scroll-mt-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-bold text-[#1C1917]">
                  Customer Reviews ({totalReviewCount})
                </h3>
                <p className="text-xs text-[#57534E] mt-0.5">
                  Verified feedback from fellow Zampa Club pet parents
                </p>
              </div>

              <button
                type="button"
                onClick={handleWriteReviewClick}
                className="inline-flex items-center gap-2 min-h-[40px] px-4 py-2 rounded-xl border border-[#E7E5E4] bg-[#FAFAF9] hover:border-[#C2410C] hover:text-[#C2410C] text-xs sm:text-sm font-semibold text-[#1C1917] transition-colors"
              >
                <MessageSquarePlus className="w-4 h-4 text-[#C2410C]" />
                <span>{isAuthenticated ? 'Write a Review' : 'Sign In to Review'}</span>
              </button>
            </div>

            {reviewSuccess && (
              <div className="rounded-xl bg-[#0F766E]/10 border border-[#0F766E]/25 px-4 py-3 text-sm text-[#115E59] font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{reviewSuccess}</span>
              </div>
            )}

            {showReviewForm && isAuthenticated && (
              <form
                onSubmit={handleReviewSubmit}
                className="rounded-2xl border border-[#E7E5E4] bg-[#FAFAF9] p-4 sm:p-5 space-y-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-[#1C1917]">
                    Reviewing as {user?.displayName || user?.email}
                  </span>
                  <div className="flex items-center gap-1" role="group" aria-label="Star rating">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        className="p-1 rounded-lg hover:bg-white transition-colors"
                        aria-label={`Rate ${star} out of 5 stars`}
                      >
                        <Star
                          className={`w-5 h-5 ${
                            star <= reviewRating
                              ? 'fill-[#C2410C] text-[#C2410C]'
                              : 'text-[#D6D3D1]'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="product-review-textarea"
                    className="block text-xs font-semibold text-[#57534E] mb-1.5"
                  >
                    Your Review
                  </label>
                  <textarea
                    id="product-review-textarea"
                    required
                    minLength={4}
                    maxLength={2000}
                    rows={3}
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="Share how your pet likes this item..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E7E5E4] text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-[#C2410C]/30 focus:border-[#C2410C]"
                  />
                </div>

                {reviewError && (
                  <p className="text-xs font-medium text-red-700">{reviewError}</p>
                )}

                <div className="flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowReviewForm(false)}
                    className="min-h-[40px] px-4 py-2 rounded-xl border border-[#E7E5E4] bg-white text-xs font-semibold text-[#57534E] hover:text-[#1C1917]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="min-h-[40px] inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#C2410C] hover:bg-[#9A3412] disabled:opacity-60 text-white text-xs font-semibold transition-colors"
                  >
                    {submittingReview ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <span>Submit Review</span>
                    )}
                  </button>
                </div>
              </form>
            )}

            {loadingReviews ? (
              <div className="py-4 text-xs text-[#57534E] flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#C2410C]" />
                <span>Loading customer reviews...</span>
              </div>
            ) : reviews.length === 0 ? (
              <div className="rounded-xl border border-[#E7E5E4] bg-[#FAFAF9] px-4 py-4 text-sm text-[#57534E]">
                No written reviews yet. Be the first pet parent to share your thoughts!
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.slice(0, 6).map((rev) => (
                  <div
                    key={rev.id}
                    className="rounded-xl border border-[#E7E5E4] bg-[#FAFAF9] p-4 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-[#1C1917]">
                        {rev.reviewer}
                      </span>
                      <div className="flex items-center gap-0.5" aria-label={`${rev.rating} out of 5 stars`}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${
                              s <= rev.rating
                                ? 'fill-[#C2410C] text-[#C2410C]'
                                : 'text-[#D6D3D1]'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-[#57534E] leading-relaxed">{rev.review}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
