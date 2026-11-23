import {
  Cat,
  ChevronDown,
  ChevronRight,
  Cpu,
  Dog,
  LayoutGrid,
  Luggage,
  Menu,
  Rabbit,
  Search,
  ShoppingBag,
  Sparkles,
  Star,
  Tag,
  User,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { formatUsd } from '../config/woocommerce';
import { MacroCategorySlug, MegaCategory, Product } from '../types/shop';
import { ResilientImage } from './ResilientImage';
import { ZampaLogo } from './ZampaLogo';

interface HeaderProps {
  products: Product[];
  megaCategories: MegaCategory[];
  cartCount: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectCategory: (
    slug: MacroCategorySlug,
    subFilter?: string,
    categoryId?: number
  ) => void;
  onSelectProduct: (product: Product) => void;
  onOpenCart: () => void;
  onOpenAccount: () => void;
  onResetFilters: () => void;
}

function CategoryIcon({
  name,
  className = 'w-4 h-4',
}: {
  name: MegaCategory['iconName'];
  className?: string;
}) {
  switch (name) {
    case 'Dog':
      return <Dog className={className} />;
    case 'Cat':
      return <Cat className={className} />;
    case 'Luggage':
      return <Luggage className={className} />;
    case 'Sparkles':
      return <Sparkles className={className} />;
    case 'Cpu':
      return <Cpu className={className} />;
    case 'Rabbit':
      return <Rabbit className={className} />;
    case 'Star':
      return <Star className={className} />;
    case 'Tag':
      return <Tag className={className} />;
  }
}

export function Header({
  products,
  megaCategories,
  cartCount,
  searchQuery,
  onSearchChange,
  onSelectCategory,
  onSelectProduct,
  onOpenCart,
  onOpenAccount,
  onResetFilters,
}: HeaderProps) {
  const [megaOpen, setMegaOpen] = useState(false);
  const [hoveredCatSlug, setHoveredCatSlug] = useState<MacroCategorySlug>(
    megaCategories[0]?.slug || 'dogs'
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedMobileCat, setExpandedMobileCat] = useState<MacroCategorySlug | null>(
    megaCategories[0]?.slug || 'dogs'
  );
  const [searchFocused, setSearchFocused] = useState(false);

  const closeTimeoutRef = useRef<number | null>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (
      megaCategories.length > 0 &&
      !megaCategories.some((c) => c.slug === hoveredCatSlug)
    ) {
      setHoveredCatSlug(megaCategories[0].slug);
    }
  }, [megaCategories, hoveredCatSlug]);

  const openMegaMenu = () => {
    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setMegaOpen(true);
  };

  const scheduleCloseMegaMenu = () => {
    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current);
    }
    closeTimeoutRef.current = window.setTimeout(() => {
      setMegaOpen(false);
      closeTimeoutRef.current = null;
    }, 150);
  };

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current !== null) {
        window.clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeMegaCategory = useMemo(
    () =>
      megaCategories.find((c) => c.slug === hoveredCatSlug) ||
      megaCategories[0],
    [megaCategories, hoveredCatSlug]
  );

  const featuredFlyoutProduct = useMemo(() => {
    if (!activeMegaCategory) return products[0];
    return (
      products.find((p) => p.id === activeMegaCategory.featuredProductId) ||
      (activeMegaCategory.id
        ? products.find((p) => p.categoryIds.includes(activeMegaCategory.id!))
        : undefined) ||
      products.find((p) => p.categorySlug === activeMegaCategory.slug) ||
      products[0]
    );
  }, [products, activeMegaCategory]);

  const liveSuggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.categoryLabel.toLowerCase().includes(q) ||
          p.subcategories.some((s) => s.toLowerCase().includes(q)) ||
          p.short_description.toLowerCase().includes(q)
      )
      .slice(0, 5);
  }, [products, searchQuery]);

  const handleCategoryClick = (
    slug: MacroCategorySlug,
    subFilter?: string,
    categoryId?: number
  ) => {
    setMegaOpen(false);
    setMobileMenuOpen(false);
    onSelectCategory(slug, subFilter, categoryId);
  };

  const quickNavCategories = useMemo(
    () => megaCategories.slice(0, 5),
    [megaCategories]
  );

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E7E5E4]">
      {/* Reassuring Top Bar */}
      <div className="bg-[#1C1917] text-[#FAFAF9] text-xs py-2 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-center md:justify-between gap-4 text-center">
          <span className="font-medium whitespace-nowrap">
            Free shipping on orders over $39
          </span>
          <span className="hidden md:inline text-[#D6D3D1] whitespace-nowrap">
            Curated essentials for dogs, cats & small pets
          </span>
          <span className="hidden sm:inline text-[#D6D3D1] whitespace-nowrap">
            Easy 30-day returns
          </span>
        </div>
      </div>

      {/* Main Sticky Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 sm:gap-6 h-16 sm:h-20">
          {/* Mobile menu trigger + Brand Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden w-10 h-10 rounded-xl border border-[#E7E5E4] flex items-center justify-center text-[#1C1917] hover:bg-[#F5F5F4] transition-colors"
              aria-label="Open category menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={onResetFilters}
              className="text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F97316] rounded-lg"
              aria-label="Back to Zampa Club home"
            >
              <ZampaLogo size="md" />
            </button>
          </div>

          {/* Central Wide Live Search Bar */}
          <div ref={searchBoxRef} className="hidden md:block flex-1 max-w-2xl relative">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-[#78716C] absolute left-4 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onFocus={() => setSearchFocused(true)}
                onChange={(e) => {
                  onSearchChange(e.target.value);
                  setSearchFocused(true);
                }}
                placeholder="Search orthopedic beds, cat towers, Wi-Fi feeders, carriers..."
                aria-label="Search products in catalog"
                className="w-full pl-11 pr-10 py-2.5 rounded-xl bg-[#FAFAF9] border border-[#E7E5E4] text-sm text-[#1C1917] placeholder:text-[#78716C] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F97316]/25 focus:border-[#F97316] transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 p-1 text-[#78716C] hover:text-[#1C1917]"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Live Search Suggestions Dropdown */}
            {searchFocused && searchQuery.trim().length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl border border-[#E7E5E4] shadow-xl overflow-hidden z-50">
                {liveSuggestions.length > 0 ? (
                  <div className="divide-y divide-[#F5F5F4]">
                    {liveSuggestions.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setSearchFocused(false);
                          onSelectProduct(item);
                        }}
                        className="w-full flex items-center gap-3.5 px-4 py-3 hover:bg-[#FAFAF9] text-left transition-colors"
                      >
                        <div className="w-12 h-12 rounded-lg overflow-hidden border border-[#E7E5E4] shrink-0 bg-white p-1">
                          <ResilientImage
                            src={item.images[0]}
                            alt={item.name}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-[#1C1917] truncate">
                            {item.name}
                          </div>
                          <div className="text-xs text-[#57534E] truncate">
                            {item.categoryLabel}
                            {item.subcategories[0] ? ` · ${item.subcategories[0]}` : ''}
                          </div>
                        </div>
                        <div className="text-sm font-bold text-[#1C1917] tabular-nums shrink-0">
                          {formatUsd(item.price)}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-5 text-sm text-[#57534E] text-center">
                    No products found for &ldquo;{searchQuery}&rdquo;. Try searching for
                    &ldquo;bed&rdquo;, &ldquo;cat&rdquo;, or &ldquo;Wi-Fi&rdquo;.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Actions: Account & Cart */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={onOpenAccount}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-transparent hover:border-[#E7E5E4] hover:bg-[#FAFAF9] text-sm font-medium text-[#1C1917] transition-colors whitespace-nowrap"
              aria-label="Account and WooCommerce store connection"
            >
              <User className="w-5 h-5 text-[#57534E]" />
              <span className="hidden sm:inline">Account</span>
            </button>

            <button
              type="button"
              onClick={onOpenCart}
              className="relative inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#1C1917] hover:bg-[#292524] text-white text-sm font-semibold transition-colors whitespace-nowrap shadow-sm"
              aria-label={`Open cart, ${cartCount} items`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">Cart</span>
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[#F97316] text-white text-xs font-bold tabular-nums">
                {cartCount}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="md:hidden pb-3">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-[#78716C] absolute left-3.5 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search products for dogs, cats, tech..."
              aria-label="Search products"
              className="w-full pl-10 pr-8 py-2 rounded-xl bg-[#FAFAF9] border border-[#E7E5E4] text-sm text-[#1C1917] placeholder:text-[#78716C] focus:bg-white focus:outline-none focus:border-[#F97316]"
            />
          </div>
        </div>

        {/* Desktop Mega Menu Bar */}
        <nav
          aria-label="Main categories"
          className="hidden lg:flex items-center gap-6 border-t border-[#F5F5F4] h-12 relative"
        >
          {/* "All Categories" Trigger + Flyout Wrapper */}
          <div
            className="relative h-full flex items-center"
            onMouseEnter={openMegaMenu}
            onMouseLeave={scheduleCloseMegaMenu}
          >
            <button
              type="button"
              onClick={() => setMegaOpen((prev) => !prev)}
              aria-expanded={megaOpen}
              className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                megaOpen
                  ? 'bg-[#F97316] text-white'
                  : 'bg-[#1C1917] text-white hover:bg-[#F97316]'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>All Categories</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-150 ${
                  megaOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* CJ-Style Mega Menu Dropdown + Flyout */}
            {megaOpen && activeMegaCategory && (
              <div
                onMouseEnter={openMegaMenu}
                onMouseLeave={scheduleCloseMegaMenu}
                className="absolute left-0 top-full pt-1.5 z-50 flex"
              >
                <div className="flex bg-white rounded-2xl border border-[#E7E5E4] shadow-2xl overflow-hidden">
                  {/* Left Vertical List: Dynamic Macro Categories */}
                  <div className="w-64 bg-[#FAFAF9] border-r border-[#E7E5E4] py-2">
                    {megaCategories.map((cat) => {
                      const isActive = cat.slug === activeMegaCategory.slug;
                      return (
                        <button
                          key={cat.id || cat.slug}
                          type="button"
                          onMouseEnter={() => setHoveredCatSlug(cat.slug)}
                          onFocus={() => setHoveredCatSlug(cat.slug)}
                          onClick={() =>
                            handleCategoryClick(cat.slug, undefined, cat.id)
                          }
                          className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors text-left ${
                            isActive
                              ? 'bg-white text-[#F97316] font-semibold shadow-[inset_3px_0_0_#F97316]'
                              : 'text-[#1C1917] hover:bg-white/70 font-medium'
                          }`}
                        >
                          <span className="flex items-center gap-2.5 min-w-0">
                            <CategoryIcon
                              name={cat.iconName}
                              className={`w-4 h-4 shrink-0 ${
                                isActive ? 'text-[#F97316]' : 'text-[#57534E]'
                              }`}
                            />
                            <span className="truncate">{cat.name}</span>
                          </span>
                          <ChevronRight
                            className={`w-4 h-4 shrink-0 ${
                              isActive ? 'text-[#F97316]' : 'text-[#A8A29E]'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>

                  {/* Right Flyout Panel: 3 Subcategory Columns + Featured Product Card */}
                  <div className="w-[700px] p-6 bg-white flex flex-col justify-between gap-5">
                    <div>
                      <div className="flex items-baseline justify-between border-b border-[#F5F5F4] pb-3 mb-4">
                        <div>
                          <h3 className="font-display text-lg font-bold text-[#1C1917]">
                            {activeMegaCategory.name}
                          </h3>
                          <p className="text-xs text-[#57534E]">
                            {activeMegaCategory.tagline}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            handleCategoryClick(
                              activeMegaCategory.slug,
                              undefined,
                              activeMegaCategory.id
                            )
                          }
                          className="text-xs font-semibold text-[#F97316] hover:text-[#EA580C] whitespace-nowrap"
                        >
                          Shop all {activeMegaCategory.name} →
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-5">
                        {activeMegaCategory.columns.map((col) => (
                          <div key={col.heading} className="space-y-2.5">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-[#78716C]">
                              {col.heading}
                            </h4>
                            <ul className="space-y-1.5">
                              {col.links.map((lnk) => (
                                <li key={lnk.label}>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleCategoryClick(
                                        lnk.categorySlug || activeMegaCategory.slug,
                                        lnk.filterTerm,
                                        lnk.categoryId || activeMegaCategory.id
                                      )
                                    }
                                    className="text-sm text-[#1C1917] hover:text-[#F97316] hover:translate-x-0.5 transition-all text-left"
                                  >
                                    {lnk.label}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Featured Product Card inside Flyout */}
                    {featuredFlyoutProduct && (
                      <div className="rounded-xl border border-[#E7E5E4] bg-[#FAFAF9] p-3.5 flex items-center gap-4">
                        <div className="w-20 h-20 rounded-lg overflow-hidden border border-[#E7E5E4] shrink-0 bg-white p-1.5">
                          <ResilientImage
                            src={featuredFlyoutProduct.images[0]}
                            alt={featuredFlyoutProduct.name}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#0D9488]">
                            Featured · {activeMegaCategory.name}
                          </div>
                          <div className="text-sm font-bold text-[#1C1917] truncate">
                            {featuredFlyoutProduct.name}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-sm font-bold text-[#F97316] tabular-nums">
                              {formatUsd(featuredFlyoutProduct.price)}
                            </span>
                            {featuredFlyoutProduct.regular_price && (
                              <span className="text-xs text-[#78716C] line-through tabular-nums">
                                {formatUsd(featuredFlyoutProduct.regular_price)}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setMegaOpen(false);
                            onSelectProduct(featuredFlyoutProduct);
                          }}
                          className="px-3.5 py-2 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
                        >
                          View Item
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Single-Line Nav Links */}
          <div className="flex items-center gap-6 text-sm font-medium text-[#57534E] overflow-x-auto">
            <button
              type="button"
              onClick={onResetFilters}
              className="hover:text-[#F97316] transition-colors whitespace-nowrap shrink-0"
            >
              Shop All
            </button>
            {quickNavCategories.map((item) => (
              <button
                key={item.id || item.slug}
                type="button"
                onClick={() => handleCategoryClick(item.slug, undefined, item.id)}
                className="hover:text-[#F97316] transition-colors whitespace-nowrap shrink-0"
              >
                {item.name}
              </button>
            ))}
          </div>
        </nav>
      </div>

      {/* Mobile Fluid Side Drawer with Dynamic Accordion Categories */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-[1px]"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-80 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col z-10">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E7E5E4]">
              <ZampaLogo size="sm" />
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-[#57534E] hover:bg-[#F5F5F4]"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-[#F5F5F4]">
              {megaCategories.map((cat) => {
                const expanded = expandedMobileCat === cat.slug;
                return (
                  <div key={cat.id || cat.slug}>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedMobileCat(expanded ? null : cat.slug)
                      }
                      className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-semibold text-[#1C1917] hover:bg-[#FAFAF9]"
                    >
                      <span className="flex items-center gap-3">
                        <CategoryIcon name={cat.iconName} className="w-4 h-4 text-[#F97316]" />
                        <span>{cat.name}</span>
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-[#78716C] transition-transform duration-150 ${
                          expanded ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {expanded && (
                      <div className="bg-[#FAFAF9] px-5 pb-4 pt-1 space-y-3">
                        <button
                          type="button"
                          onClick={() =>
                            handleCategoryClick(cat.slug, undefined, cat.id)
                          }
                          className="text-xs font-bold text-[#F97316] hover:underline"
                        >
                          Shop all {cat.name} →
                        </button>
                        {cat.columns.map((col) => (
                          <div key={col.heading} className="space-y-1">
                            <div className="text-[11px] font-bold uppercase tracking-wider text-[#78716C]">
                              {col.heading}
                            </div>
                            <ul className="space-y-1.5 pl-1">
                              {col.links.map((lnk) => (
                                <li key={lnk.label}>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleCategoryClick(
                                        lnk.categorySlug || cat.slug,
                                        lnk.filterTerm,
                                        lnk.categoryId || cat.id
                                      )
                                    }
                                    className="text-sm text-[#1C1917] hover:text-[#F97316] text-left"
                                  >
                                    {lnk.label}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </aside>
        </div>
      )}
    </header>
  );
}
