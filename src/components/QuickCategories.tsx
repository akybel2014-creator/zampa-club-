import catCatSupplementsImg from '../assets/images/cat_cat_supplements_1795802004066.jpg';
import catChickenCoopsImg from '../assets/images/cat_chicken_coops_1795787336834.jpg';
import catDogSupplementsImg from '../assets/images/cat_dog_supplements_1795802005153.jpg';
import prodCucciaImg from '../assets/images/prod_cuccia_nuvola.webp';
import prodDistributoreImg from '../assets/images/prod_distributore_wifi.webp';
import prodSpazzolaImg from '../assets/images/prod_spazzola_vapore.webp';
import prodTelecameraImg from '../assets/images/prod_telecamera_pet.webp';
import prodTunnelImg from '../assets/images/prod_tunnel_coniglio.webp';
import prodZainoImg from '../assets/images/prod_zaino_trasportino.webp';
import { HERO_ASSETS } from '../data/storefrontAssets';
import { sortWooCategories } from '../services/wooCommerceService';
import { MacroCategorySlug, WooCategory } from '../types/shop';
import { ResilientImage } from './ResilientImage';

interface QuickCategoriesProps {
  wooCategories: WooCategory[];
  loading: boolean;
  activeCategorySlug: MacroCategorySlug | null;
  activeCategoryId: number | null;
  onSelectCategory: (slug: MacroCategorySlug, subFilter?: string, categoryId?: number) => void;
}

function resolveCategoryImage(cat: WooCategory): string {
  const slug = cat.slug.toLowerCase();
  const name = cat.name.toLowerCase();

  const isSupplement =
    slug.includes('supplement') ||
    slug === 'snack' ||
    name.includes('supplement');

  if (
    isSupplement &&
    (slug.includes('cat') || name.includes('cat') || name.includes('gatti'))
  ) {
    return catCatSupplementsImg;
  }
  if (
    isSupplement &&
    (slug.includes('dog') ||
      slug === 'snack' ||
      name.includes('dog') ||
      name.includes('cani'))
  ) {
    return catDogSupplementsImg;
  }
  if (
    slug === 'dog' ||
    slug === 'dogs' ||
    slug === 'cani' ||
    name === 'dog' ||
    name === 'dogs'
  ) {
    return HERO_ASSETS.promoDogs;
  }
  if (
    slug === 'cat' ||
    slug === 'cats' ||
    slug === 'gatti' ||
    name === 'cat' ||
    name === 'cats'
  ) {
    return HERO_ASSETS.promoCats;
  }
  if (
    slug.includes('chicken') ||
    slug.includes('coop') ||
    name.includes('chicken') ||
    name.includes('coop')
  ) {
    return catChickenCoopsImg;
  }
  if (cat.image) {
    return cat.image;
  }
  if (slug.includes('home') || slug.includes('comfort') || name.includes('home') || name.includes('bed')) {
    return prodCucciaImg;
  }
  if (slug.includes('travel') || slug.includes('carrier') || slug.includes('gear') || name.includes('travel')) {
    return prodZainoImg;
  }
  if (slug.includes('food') || slug.includes('treat') || name.includes('food')) {
    return prodDistributoreImg;
  }
  if (slug.includes('groom') || slug.includes('care') || name.includes('groom')) {
    return prodSpazzolaImg;
  }
  if (slug.includes('tech') || slug.includes('smart') || name.includes('tech')) {
    return prodTelecameraImg;
  }
  if (slug.includes('small') || slug.includes('rabbit') || name.includes('small')) {
    return prodTunnelImg;
  }

  return HERO_ASSETS.mainBanner;
}

export function QuickCategories({
  wooCategories,
  loading,
  activeCategorySlug,
  activeCategoryId,
  onSelectCategory,
}: QuickCategoriesProps) {
  const activeCat = activeCategoryId
    ? wooCategories.find((c) => c.id === activeCategoryId)
    : undefined;
  const activeParentCategoryId =
    activeCat && activeCat.parent !== 0 ? activeCat.parent : activeCategoryId;

  const tiles = sortWooCategories(wooCategories.filter((c) => c.parent === 0))
    .slice(0, 6)
    .map((cat) => {
      const childCategories = wooCategories.filter((c) => c.parent === cat.id);
      return {
        id: cat.id,
        slug: cat.slug,
        title: cat.name,
        subtitle:
          childCategories.length > 0
            ? `${cat.count} ${cat.count === 1 ? 'item' : 'items'} · ${childCategories[0].name}`
            : `${cat.count} ${cat.count === 1 ? 'item' : 'items'}`,
        image: resolveCategoryImage(cat),
      };
    });

  if (!loading && tiles.length === 0) {
    return null;
  }

  const gridColsClass =
    tiles.length === 5 || loading
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

      {loading ? (
        <div className={`grid ${gridColsClass} gap-4`}>
          {Array.from({ length: 5 }).map((_, idx) => (
            <div
              key={idx}
              className="rounded-2xl p-3 border border-[#E7E5E4] bg-white animate-pulse"
            >
              <div className="w-24 h-24 sm:w-28 sm:h-28 mx-auto rounded-full bg-[#F5F5F4] mb-3" />
              <div className="h-4 w-20 mx-auto bg-[#E7E5E4] rounded mb-1.5" />
              <div className="h-3 w-28 mx-auto bg-[#F5F5F4] rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className={`grid ${gridColsClass} gap-4`}>
          {tiles.map((tile) => {
            const isSelected =
              (activeParentCategoryId && tile.id === activeParentCategoryId) ||
              activeCategorySlug === tile.slug;
            return (
              <button
                key={tile.id}
                type="button"
                onClick={() => onSelectCategory(tile.slug, undefined, tile.id)}
                className={`group rounded-2xl p-3 border text-center transition-all duration-200 hover:-translate-y-0.5 ${
                  isSelected
                    ? 'bg-white border-[#C2410C] shadow-md'
                    : 'bg-white border-[#E7E5E4] hover:border-[#D6D3D1] hover:shadow-sm'
                }`}
              >
                <div className="w-24 h-24 sm:w-28 sm:h-28 aspect-square mx-auto rounded-full overflow-hidden border-2 border-[#FAFAF9] shadow-sm bg-[#FAFAF9] mb-3">
                  <ResilientImage
                    src={tile.image}
                    alt={tile.title}
                    loading="lazy"
                    decoding="async"
                    width={112}
                    height={112}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div
                  className={`font-display text-sm font-bold truncate ${
                    isSelected ? 'text-[#C2410C]' : 'text-[#1C1917]'
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
      )}
    </section>
  );
}
