import { AlertCircle, ArrowUpDown, RotateCcw, SearchX } from 'lucide-react';
import {
  getDescendantCategoryIds,
  sortWooCategories,
} from '../services/wooCommerceService';
import {
  MacroCategorySlug,
  Product,
  SortOption,
  WooCategory,
} from '../types/shop';
import { ProductCard } from './ProductCard';

interface CatalogSectionProps {
  products: Product[];
  allProducts: Product[];
  wooCategories: WooCategory[];
  loading: boolean;
  errorMessage: string | null;
  activeTab: string;
  activeMacroCategory: MacroCategorySlug | null;
  activeCategoryId: number | null;
  activeSubFilter: string | null;
  searchQuery: string;
  sortBy: SortOption;
  onChangeTab: (tabSlug: string, categoryId?: number) => void;
  onSelectCategory: (
    slug: MacroCategorySlug,
    subFilter?: string,
    categoryId?: number
  ) => void;
  onChangeSort: (sort: SortOption) => void;
  onResetFilters: () => void;
  onRetry: () => void;
  onOpenProduct: (product: Product) => void;
  onQuickAdd: (product: Product) => void;
}

export function CatalogSection({
  products,
  allProducts,
  wooCategories,
  loading,
  errorMessage,
  activeTab,
  activeMacroCategory,
  activeCategoryId,
  activeSubFilter,
  searchQuery,
  sortBy,
  onChangeTab,
  onSelectCategory,
  onChangeSort,
  onResetFilters,
  onRetry,
  onOpenProduct,
  onQuickAdd,
}: CatalogSectionProps) {
  const parentCategories = sortWooCategories(
    wooCategories.filter((c) => c.parent === 0)
  );
  const tabCategories = (
    parentCategories.length > 0 ? parentCategories : sortWooCategories(wooCategories)
  ).slice(0, 4);

  const activeCategoryObj = activeCategoryId
    ? wooCategories.find((c) => c.id === activeCategoryId)
    : undefined;

  const activeParentCategory =
    activeCategoryObj && activeCategoryObj.parent !== 0
      ? wooCategories.find((c) => c.id === activeCategoryObj.parent) || activeCategoryObj
      : activeCategoryObj;

  const activeParentCategoryId = activeParentCategory?.id || null;

  // WooCommerce child categories under the active parent category
  const childCategories = activeParentCategoryId
    ? wooCategories.filter((c) => c.parent === activeParentCategoryId)
    : [];

  // Fallback subcategories derived from products when WooCommerce has no child categories
  const fallbackSubcategories =
    activeParentCategoryId && childCategories.length === 0
      ? Array.from(
          new Set(
            allProducts
              .filter((p) => {
                const ids = getDescendantCategoryIds(
                  activeParentCategoryId,
                  wooCategories
                );
                return p.categoryIds.some((id) => ids.has(id));
              })
              .flatMap((p) => p.subcategories)
              .filter(
                (sub) =>
                  sub &&
                  sub.toLowerCase() !== activeParentCategory?.name.toLowerCase()
              )
          )
        )
      : [];

  const filterTabs: { id: string; label: string; categoryId?: number }[] = [
    { id: 'all', label: 'Shop All' },
    ...tabCategories.map((cat) => ({
      id: cat.slug,
      label: cat.name,
      categoryId: cat.id,
    })),
    { id: 'deals', label: 'On Sale' },
  ];

  const hasExtraFilter =
    Boolean(activeMacroCategory) ||
    Boolean(activeCategoryId) ||
    Boolean(activeSubFilter) ||
    searchQuery.trim().length > 0;

  const activeCategoryName =
    activeParentCategory?.name ||
    wooCategories.find((c) => c.id === activeCategoryId)?.name ||
    wooCategories.find((c) => c.slug === activeMacroCategory)?.name ||
    (activeMacroCategory === 'deals'
      ? 'Deals & Value Sets'
      : activeMacroCategory === 'new-arrivals'
        ? 'New Arrivals'
        : activeMacroCategory);

  const activeChildCategoryName =
    activeCategoryObj && activeCategoryObj.parent !== 0
      ? activeCategoryObj.name
      : null;

  return (
    <section
      id="product-catalog"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 scroll-mt-24"
    >
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#1C1917] tracking-tight">
            Curated Catalog
          </h2>
          <p className="text-sm text-[#57534E] mt-1">
            {products.length}{' '}
            {products.length === 1 ? 'item available' : 'items available'} · Select
            size or color options
          </p>
        </div>

        {/* Sort & Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Dynamic Category Filter Tabs */}
          <div
            role="tablist"
            aria-label="Filter catalog"
            className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#F5F5F4] border border-[#E7E5E4] overflow-x-auto max-w-full"
          >
            {filterTabs.map((tab) => {
              const isDealsActive =
                tab.id === 'deals' &&
                (activeTab === 'deals' || activeMacroCategory === 'deals');
              const isCategoryActive =
                Boolean(tab.categoryId) &&
                (activeCategoryId === tab.categoryId ||
                  activeParentCategoryId === tab.categoryId);
              const isAllActive =
                tab.id === 'all' &&
                !activeCategoryId &&
                !activeMacroCategory &&
                !activeSubFilter &&
                activeTab === 'all';
              const isActive = isDealsActive || isCategoryActive || isAllActive;

              return (
                <button
                  key={tab.categoryId || tab.id}
                  type="button"
                  role="tab"
                  aria-selected={Boolean(isActive)}
                  onClick={() => onChangeTab(tab.id, tab.categoryId)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-white text-[#1C1917] shadow-sm'
                      : 'text-[#57534E] hover:text-[#1C1917]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Sort Dropdown */}
          <div className="relative inline-flex items-center">
            <ArrowUpDown className="w-3.5 h-3.5 text-[#57534E] absolute left-3 pointer-events-none" />
            <label htmlFor="catalog-sort" className="sr-only">
              Sort products
            </label>
            <select
              id="catalog-sort"
              value={sortBy}
              onChange={(e) => onChangeSort(e.target.value as SortOption)}
              className="pl-8 pr-4 py-2 rounded-xl bg-white border border-[#E7E5E4] text-xs sm:text-sm font-medium text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#F97316]/25 focus:border-[#F97316]"
            >
              <option value="popular">Most Popular</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Active Contextual Filter Strip + Subcategories */}
      {hasExtraFilter && (
        <div className="mb-6 rounded-xl bg-white border border-[#E7E5E4] px-4 py-3 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-[#57534E] flex flex-wrap items-center gap-2">
              <span>Active filter:</span>
              {activeCategoryName && (
                <strong className="text-[#1C1917]">{activeCategoryName}</strong>
              )}
              {(activeChildCategoryName ||
                (activeSubFilter && activeSubFilter !== 'ON_SALE')) && (
                <>
                  <span aria-hidden="true">/</span>
                  <strong className="text-[#F97316]">
                    {activeChildCategoryName || activeSubFilter}
                  </strong>
                </>
              )}
              {searchQuery.trim() && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>
                    Search:{' '}
                    <strong className="text-[#1C1917]">&ldquo;{searchQuery}&rdquo;</strong>
                  </span>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#F97316] hover:text-[#EA580C] whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Show All</span>
            </button>
          </div>

          {activeParentCategory &&
            (childCategories.length > 0 || fallbackSubcategories.length > 0) && (
              <div className="pt-2.5 border-t border-[#F5F5F4] flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-[#78716C] mr-1">
                  {activeParentCategory.name} subcategories:
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onSelectCategory(
                      activeParentCategory.slug,
                      undefined,
                      activeParentCategory.id
                    )
                  }
                  className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                    activeCategoryId === activeParentCategory.id && !activeSubFilter
                      ? 'bg-[#1C1917] text-white border-[#1C1917]'
                      : 'bg-[#FAFAF9] text-[#57534E] border-[#E7E5E4] hover:border-[#D6D3D1] hover:text-[#1C1917]'
                  }`}
                >
                  All {activeParentCategory.name}
                </button>
                {childCategories.map((child) => {
                  const isChildSelected = activeCategoryId === child.id;
                  return (
                    <button
                      key={child.id}
                      type="button"
                      onClick={() =>
                        onSelectCategory(child.slug, undefined, child.id)
                      }
                      className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                        isChildSelected
                          ? 'bg-[#F97316] text-white border-[#F97316]'
                          : 'bg-[#FAFAF9] text-[#57534E] border-[#E7E5E4] hover:border-[#D6D3D1] hover:text-[#1C1917]'
                      }`}
                    >
                      {child.name} ({child.count})
                    </button>
                  );
                })}
                {fallbackSubcategories.map((sub) => {
                  const isSubSelected =
                    activeSubFilter?.toLowerCase() === sub.toLowerCase();
                  return (
                    <button
                      key={sub}
                      type="button"
                      onClick={() =>
                        onSelectCategory(
                          activeParentCategory.slug,
                          sub,
                          activeParentCategory.id
                        )
                      }
                      className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                        isSubSelected
                          ? 'bg-[#F97316] text-white border-[#F97316]'
                          : 'bg-[#FAFAF9] text-[#57534E] border-[#E7E5E4] hover:border-[#D6D3D1] hover:text-[#1C1917]'
                      }`}
                    >
                      {sub}
                    </button>
                  );
                })}
              </div>
            )}
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl bg-white border border-[#E7E5E4] overflow-hidden animate-pulse"
            >
              <div className="aspect-square bg-[#F5F5F4]" />
              <div className="p-5 space-y-3">
                <div className="h-3 w-20 bg-[#E7E5E4] rounded" />
                <div className="h-5 w-3/4 bg-[#E7E5E4] rounded" />
                <div className="h-3 w-full bg-[#F5F5F4] rounded" />
                <div className="h-9 w-full bg-[#F5F5F4] rounded-xl mt-4" />
              </div>
            </div>
          ))}
        </div>
      ) : errorMessage && products.length === 0 ? (
        <div className="rounded-2xl bg-white border border-[#E7E5E4] p-12 text-center max-w-lg mx-auto">
          <AlertCircle className="w-10 h-10 text-[#F97316] mx-auto mb-3" />
          <h3 className="font-display text-lg font-bold text-[#1C1917]">
            Unable to load catalog from WooCommerce
          </h3>
          <p className="text-sm text-[#57534E] mt-1 mb-5">
            {errorMessage}
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white text-sm font-semibold transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Retry Connection</span>
          </button>
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-2xl bg-white border border-[#E7E5E4] p-12 text-center max-w-lg mx-auto">
          <SearchX className="w-10 h-10 text-[#78716C] mx-auto mb-3" />
          <h3 className="font-display text-lg font-bold text-[#1C1917]">
            No products found
          </h3>
          <p className="text-sm text-[#57534E] mt-1 mb-5">
            Try clearing your active filters or searching for a different keyword.
          </p>
          <button
            type="button"
            onClick={onResetFilters}
            className="px-5 py-2.5 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white text-sm font-semibold transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onOpenProduct={onOpenProduct}
              onQuickAdd={onQuickAdd}
            />
          ))}
        </div>
      )}
    </section>
  );
}
