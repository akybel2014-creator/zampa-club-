import { ArrowUpDown, RotateCcw, SearchX } from 'lucide-react';
import {
  MacroCategorySlug,
  Product,
  QuickFilterTab,
  SortOption,
} from '../types/shop';
import { ProductCard } from './ProductCard';

interface CatalogSectionProps {
  products: Product[];
  loading: boolean;
  activeTab: QuickFilterTab;
  activeMacroCategory: MacroCategorySlug | null;
  activeSubFilter: string | null;
  searchQuery: string;
  sortBy: SortOption;
  onChangeTab: (tab: QuickFilterTab) => void;
  onChangeSort: (sort: SortOption) => void;
  onResetFilters: () => void;
  onOpenProduct: (product: Product) => void;
  onQuickAdd: (product: Product) => void;
}

const FILTER_TABS: { id: QuickFilterTab; label: string }[] = [
  { id: 'tutti', label: 'Tutti' },
  { id: 'cani', label: 'Cani' },
  { id: 'gatti', label: 'Gatti' },
  { id: 'smart-pet-tech', label: 'Smart Tech' },
  { id: 'offerte', label: 'In Offerta' },
];

const MACRO_LABELS: Record<MacroCategorySlug, string> = {
  cani: 'Cani',
  gatti: 'Gatti',
  'viaggio-trasporto': 'Viaggio & Trasporto',
  'cura-toelettatura': 'Cura & Toelettatura',
  'smart-pet-tech': 'Smart Pet Tech',
  'piccoli-animali': 'Piccoli Animali',
  novita: 'Novità del Mese',
  offerte: 'Offerte & Set Risparmio',
};

export function CatalogSection({
  products,
  loading,
  activeTab,
  activeMacroCategory,
  activeSubFilter,
  searchQuery,
  sortBy,
  onChangeTab,
  onChangeSort,
  onResetFilters,
  onOpenProduct,
  onQuickAdd,
}: CatalogSectionProps) {
  const hasExtraFilter =
    Boolean(activeMacroCategory) ||
    Boolean(activeSubFilter) ||
    searchQuery.trim().length > 0;

  return (
    <section
      id="catalogo-prodotti"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 scroll-mt-24"
    >
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#1C1917] tracking-tight">
            Catalogo Selezionato
          </h2>
          <p className="text-sm text-[#57534E] mt-1">
            {products.length}{' '}
            {products.length === 1 ? 'articolo disponibile' : 'articoli disponibili'} ·
            Seleziona le varianti per taglia o colore
          </p>
        </div>

        {/* Sort & Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Quick Filter Tabs */}
          <div
            role="tablist"
            aria-label="Filtra catalogo"
            className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#F5F5F4] border border-[#E7E5E4] overflow-x-auto max-w-full"
          >
            {FILTER_TABS.map((tab) => {
              const isActive =
                !activeMacroCategory && !activeSubFilter && activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => onChangeTab(tab.id)}
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
              Ordina prodotti
            </label>
            <select
              id="catalog-sort"
              value={sortBy}
              onChange={(e) => onChangeSort(e.target.value as SortOption)}
              className="pl-8 pr-4 py-2 rounded-xl bg-white border border-[#E7E5E4] text-xs sm:text-sm font-medium text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#F97316]/25 focus:border-[#F97316]"
            >
              <option value="popular">Più popolari</option>
              <option value="price-asc">Prezzo: crescente</option>
              <option value="price-desc">Prezzo: decrescente</option>
              <option value="rating">Valutazione più alta</option>
            </select>
          </div>
        </div>
      </div>

      {/* Active Contextual Filter Strip (from Mega Menu or Search) */}
      {hasExtraFilter && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl bg-white border border-[#E7E5E4]">
          <div className="text-sm text-[#57534E] flex flex-wrap items-center gap-2">
            <span>Filtro attivo:</span>
            {activeMacroCategory && (
              <strong className="text-[#1C1917]">
                {MACRO_LABELS[activeMacroCategory]}
              </strong>
            )}
            {activeSubFilter && activeSubFilter !== 'IN_OFFERTA' && (
              <>
                <span aria-hidden="true">/</span>
                <strong className="text-[#F97316]">{activeSubFilter}</strong>
              </>
            )}
            {searchQuery.trim() && (
              <>
                <span aria-hidden="true">·</span>
                <span>
                  Ricerca:{' '}
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
            <span>Mostra tutto</span>
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
            Nessun articolo corrisponde ai filtri
          </h3>
          <p className="text-sm text-[#57534E] mt-1 mb-5">
            Prova a rimuovere i filtri attivi o cerca un altro termine nel catalogo.
          </p>
          <button
            type="button"
            onClick={onResetFilters}
            className="px-5 py-2.5 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white text-sm font-semibold transition-colors"
          >
            Ripristina catalogo completo
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
