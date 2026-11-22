import { QUICK_CATEGORIES } from '../data/mockProducts';
import { MacroCategorySlug, WooCategory } from '../types/shop';
import { ResilientImage } from './ResilientImage';

interface QuickCategoriesProps {
  wooCategories: WooCategory[];
  sourceMode: 'woocommerce' | 'fallback';
  activeCategorySlug: MacroCategorySlug | null;
  activeCategoryId: number | null;
  onSelectCategory: (slug: MacroCategorySlug, subFilter?: string, categoryId?: number) => void;
}

export function QuickCategories({
  wooCategories,
  sourceMode,
  activeCategorySlug,
  activeCategoryId,
  onSelectCategory,
}: QuickCategoriesProps) {
  const tiles =
    sourceMode === 'woocommerce' && wooCategories.length > 0
      ? wooCategories
          .filter((c) => c.parent === 0)
          .slice(0, 6)
          .map((cat, idx) => ({
            id: cat.id,
            slug: cat.slug,
            title: cat.name,
            subtitle: `${cat.count} ${cat.count === 1 ? 'item' : 'items'}`,
            image:
              cat.image ||
              QUICK_CATEGORIES[idx % QUICK_CATEGORIES.length]?.image ||
              '/src/assets/images/promo_speciale_cani_1795364699104.jpg',
          }))
      : QUICK_CATEGORIES;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-end justify-between mb-5">
        <div>
          <h2 className="font-display text-2xl font-bold text-[#1C1917] tracking-tight">
            Shop by Pet or Need
          </h2>
          <p className="text-sm text-[#57534E] mt-0.5">
            Jump straight to the essentials tailored for your companion
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {tiles.map((tile) => {
          const isSelected =
            (activeCategoryId && tile.id === activeCategoryId) ||
            activeCategorySlug === tile.slug;
          return (
            <button
              key={tile.id || tile.slug}
              type="button"
              onClick={() => onSelectCategory(tile.slug, undefined, tile.id)}
              className={`group rounded-2xl p-3 border text-center transition-all duration-200 hover:-translate-y-0.5 ${
                isSelected
                  ? 'bg-white border-[#F97316] shadow-md'
                  : 'bg-white border-[#E7E5E4] hover:border-[#D6D3D1] hover:shadow-sm'
              }`}
            >
              <div className="w-24 h-24 sm:w-28 sm:h-28 mx-auto rounded-full overflow-hidden border-2 border-[#FAFAF9] shadow-sm bg-[#FAFAF9] mb-3">
                <ResilientImage
                  src={tile.image}
                  alt={tile.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div
                className={`font-display text-sm font-bold truncate ${
                  isSelected ? 'text-[#F97316]' : 'text-[#1C1917]'
                }`}
              >
                {tile.title}
              </div>
              <div className="text-xs text-[#57534E] mt-0.5 line-clamp-1">
                {tile.subtitle}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
