import { HERO_ASSETS, QUICK_CATEGORIES } from '../data/mockProducts';
import { sortWooCategories } from '../services/wooCommerceService';
import { MacroCategorySlug, WooCategory } from '../types/shop';
import { ResilientImage } from './ResilientImage';

interface QuickCategoriesProps {
  wooCategories: WooCategory[];
  sourceMode: 'woocommerce' | 'fallback';
  activeCategorySlug: MacroCategorySlug | null;
  activeCategoryId: number | null;
  onSelectCategory: (slug: MacroCategorySlug, subFilter?: string, categoryId?: number) => void;
}

function resolveCategoryImage(cat: WooCategory): string {
  const slug = cat.slug.toLowerCase();
  const name = cat.name.toLowerCase();

  if (slug === 'dog' || slug === 'dogs' || slug === 'cani' || /\bdogs?\b/.test(name)) {
    return HERO_ASSETS.promoDogs;
  }
  if (slug === 'cat' || slug === 'cats' || slug === 'gatti' || /\bcats?\b/.test(name)) {
    return HERO_ASSETS.promoCats;
  }
  if (cat.image) {
    return cat.image;
  }
  if (slug.includes('home') || slug.includes('comfort') || name.includes('home') || name.includes('bed')) {
    return '/src/assets/images/prod_cuccia_nuvola_1795364644235.jpg';
  }
  if (slug.includes('travel') || slug.includes('carrier') || slug.includes('gear') || name.includes('travel')) {
    return '/src/assets/images/prod_zaino_trasportino_1795364644987.jpg';
  }
  if (slug.includes('food') || slug.includes('treat') || name.includes('food')) {
    return '/src/assets/images/prod_distributore_wifi_1795364737907.jpg';
  }
  if (slug.includes('groom') || slug.includes('care') || name.includes('groom')) {
    return '/src/assets/images/prod_spazzola_vapore_1795364645060.jpg';
  }
  if (slug.includes('tech') || slug.includes('smart') || name.includes('tech')) {
    return '/src/assets/images/prod_telecamera_pet_1795364738227.jpg';
  }
  if (slug.includes('small') || slug.includes('rabbit') || name.includes('small')) {
    return '/src/assets/images/prod_tunnel_coniglio_1795364643962.jpg';
  }

  return (
    QUICK_CATEGORIES.find((q) => q.slug === cat.slug)?.image ||
    HERO_ASSETS.mainBanner
  );
}

export function QuickCategories({
  wooCategories,
  sourceMode,
  activeCategorySlug,
  activeCategoryId,
  onSelectCategory,
}: QuickCategoriesProps) {
  const activeCat = activeCategoryId
    ? wooCategories.find((c) => c.id === activeCategoryId)
    : undefined;
  const activeParentCategoryId =
    activeCat && activeCat.parent !== 0 ? activeCat.parent : activeCategoryId;

  const tiles =
    sourceMode === 'woocommerce' && wooCategories.length > 0
      ? sortWooCategories(wooCategories.filter((c) => c.parent === 0))
          .slice(0, 6)
          .map((cat) => {
            const childCategories = wooCategories.filter((c) => c.parent === cat.id);
            const fallbackTile = QUICK_CATEGORIES.find(
              (q) =>
                q.slug === cat.slug ||
                (q.slug === 'dogs' && cat.slug === 'dog') ||
                (q.slug === 'cats' && cat.slug === 'cat')
            );
            return {
              id: cat.id,
              slug: cat.slug,
              title: cat.name,
              subtitle:
                childCategories.length > 0
                  ? `${cat.count} ${cat.count === 1 ? 'item' : 'items'} · ${childCategories[0].name}`
                  : fallbackTile?.subtitle ||
                    `${cat.count} ${cat.count === 1 ? 'item' : 'items'}`,
              image: resolveCategoryImage(cat),
            };
          })
      : QUICK_CATEGORIES;

  const gridColsClass =
    tiles.length === 5
      ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
      : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6';

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

      <div className={`grid ${gridColsClass} gap-4`}>
        {tiles.map((tile) => {
          const isSelected =
            (activeParentCategoryId && tile.id === activeParentCategoryId) ||
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
