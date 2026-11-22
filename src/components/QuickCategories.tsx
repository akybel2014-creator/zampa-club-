import { QUICK_CATEGORIES } from '../data/mockProducts';
import { MacroCategorySlug } from '../types/shop';
import { ResilientImage } from './ResilientImage';

interface QuickCategoriesProps {
  activeCategorySlug: MacroCategorySlug | null;
  onSelectCategory: (slug: MacroCategorySlug) => void;
}

export function QuickCategories({
  activeCategorySlug,
  onSelectCategory,
}: QuickCategoriesProps) {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-end justify-between mb-5">
        <div>
          <h2 className="font-display text-2xl font-bold text-[#1C1917] tracking-tight">
            Naviga per animale o esigenza
          </h2>
          <p className="text-sm text-[#57534E] mt-0.5">
            Scegli subito la sezione dedicata al tuo compagno
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {QUICK_CATEGORIES.map((tile) => {
          const isSelected = activeCategorySlug === tile.slug;
          return (
            <button
              key={tile.slug}
              type="button"
              onClick={() => onSelectCategory(tile.slug)}
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
                className={`font-display text-sm font-bold ${
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
