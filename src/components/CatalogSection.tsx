import { ArrowUpDown, RotateCcw, SearchX } from 'lucide-react';
import {
  MacroCategorySlug,
  Product,
  SortOption,
  WooCategory,
} from '../types/shop';
import { ProductCard } from './ProductCard';

interface CatalogSectionProps {
  products: Product[];
  wooCategories: WooCategory[];
  loading: boolean;
  activeTab: string;
  activeMacroCategory: MacroCategorySlug | null;
  activeCategoryId: number | null;
  activeSubFilter: string | null;
  searchQuery: string;
  sortBy: SortOption;
  onChangeTab: (tabSlug: string, categoryId?: number) => void;
  onChangeSort: (sort: SortOption) => void;
  onResetFilters: () => void;
  onOpenProduct: (product: Product) => void;
  onQuickAdd: (product: Product) => void;
}

export function CatalogSection({
  products,
  wooCategories,
  loading,
  activeTab,
  activeMacroCategory,
  activeCategoryId,
  activeSubFilter,
  searchQuery,
  sortBy,
  onChangeTab,
  onChangeSort,
  onResetFilters,
  onOpenProduct,
  onQuickAdd,
}: CatalogSectionProps) {
  const parentCategories = wooCategories.filter((c) => c.parent === 0);
  const tabCategories = (parentCategories.length > 0 ? parentCategories : wooCategories).slice(
    0,
    4
  );

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
    wooCategories.find((c) => c.id === activeCategoryId)?.name ||
    wooCategories.find((c) => c.slug === activeMacroCategory)?.name ||
    (activeMacroCategory === 'deals'
      ? 'Deals & Value Sets'
      : activeMacroCategory === 'new-arrivals'
        ? 'New Arrivals'
        : activeMacroCategory);

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
              const isActive =
                !activeMacroCategory &&
                !activeSubFilter &&
                ((tab.categoryId && activeCategoryId === tab.categoryId) ||
                  (!activeCategoryId && activeTab === tab.id));

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

      {/* Active Contextual Filter Strip */}
      {hasExtraFilter && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl bg-white border border-[#E7E5E4]">
          <div className="text-sm text-[#57534E] flex flex-wrap items-center gap-2">
            <span>Active filter:</span>
            {activeCategoryName && (
              <strong className="text-[#1C1917]">{activeCategoryName}</strong>
            )}
            {activeSubFilter && activeSubFilter !== 'ON_SALE' && (
              <>
                <span aria-hidden="true">/</span>
                <strong className="text-[#F97316]">{activeSubFilter}</strong>
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
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl bg-white border border-[#E7E5E4] overflow-hidden animate-pulse"
            >
              <div className="aspect-[4/3] bg-[#F5F5F4]" />
              <div className="p-5 space-y-3">
                <div className="h-3 w-20 bg-[#E7E5E4] rounded" />
                <div className="h-5 w-3/4 bg-[#E7E5E4] rounded" />
                <div className="h-3 w-full bg-[#F5F5F4] rounded" />
                <div className="h-9 w-full bg-[#F5F5F4] rounded-xl mt-4" />
              </div>
            </div>
          ))}
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
