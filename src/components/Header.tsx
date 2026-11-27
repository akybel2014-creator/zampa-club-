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
import { createPortal } from 'react-dom';
import { formatUsd } from '../config/woocommerce';
import { useAuth } from '../context/AuthContext';
import {
  MacroCategorySlug,
  MegaCategory,
  MegaSubcategoryNode,
  Product,
} from '../types/shop';
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
  const { user, isAuthenticated } = useAuth();
  const [megaOpen, setMegaOpen] = useState(false);
  const [hoveredCatSlug, setHoveredCatSlug] = useState<MacroCategorySlug>(
    megaCategories[0]?.slug || ''
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedMobileCat, setExpandedMobileCat] = useState<MacroCategorySlug | null>(
    megaCategories[0]?.slug || null
  );
  const [hasToggledMobileCat, setHasToggledMobileCat] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const closeTimeoutRef = useRef<number | null>(null);
  const desktopSearchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (
      megaCategories.length > 0 &&
      !megaCategories.some((c) => c.slug === hoveredCatSlug)
    ) {
      setHoveredCatSlug(megaCategories[0].slug);
    }
    if (
      megaCategories.length > 0 &&
      !hasToggledMobileCat &&
      expandedMobileCat === null
    ) {
      setExpandedMobileCat(megaCategories[0].slug);
    }
  }, [megaCategories, hoveredCatSlug, hasToggledMobileCat, expandedMobileCat]);

  // Lock body scroll & handle Escape key when mobile/tablet drawer is open
  useEffect(() => {
    if (!mobileMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileMenuOpen]);

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
    const handleClickOutside = (e: PointerEvent) => {
      const target = e.target as Node;
      const inDesktop =
        desktopSearchRef.current && desktopSearchRef.current.contains(target);
      const inMobile =
        mobileSearchRef.current && mobileSearchRef.current.contains(target);
      if (!inDesktop && !inMobile) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
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

  const renderMobileSubcategoryList = (
    nodes: MegaSubcategoryNode[],
    depth = 0
  ) =>
    nodes.map((node) => (
      <div key={node.id} className={depth > 0 ? 'pl-3 border-l border-[#E7E5E4] ml-2' : ''}>
        <button
          type="button"
          onClick={() => handleCategoryClick(node.slug, undefined, node.id)}
          className="w-full min-h-[44px] flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-sm font-medium text-[#1C1917] hover:bg-white hover:text-[#C2410C] active:bg-white transition-colors text-left"
        >
          <span className="break-words min-w-0 leading-snug">{node.name}</span>
          <span className="inline-flex items-center gap-1 text-xs text-[#78716C] tabular-nums shrink-0">
            <span>({node.count})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </button>
        {node.children && node.children.length > 0 && (
          <div className="mt-0.5 space-y-0.5">
            {renderMobileSubcategoryList(node.children, depth + 1)}
          </div>
        )}
      </div>
    ));

  const renderSearchSuggestions = () =>
    searchFocused &&
    searchQuery.trim().length > 0 && (
      <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl border border-[#E7E5E4] shadow-xl overflow-hidden z-50 max-h-[60dvh] overflow-y-auto">
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
                className="w-full min-h-[56px] flex items-center gap-3.5 px-4 py-3 hover:bg-[#FAFAF9] text-left transition-colors"
              >
                <div className="w-12 h-12 aspect-square rounded-lg overflow-hidden border border-[#E7E5E4] shrink-0 bg-white p-1">
                  <ResilientImage
                    src={item.images[0]}
                    alt={item.name}
                    loading="lazy"
                    decoding="async"
                    width={48}
                    height={48}
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
            &ldquo;dog&rdquo;, &ldquo;cat&rdquo;, or &ldquo;feeder&rdquo;.
          </div>
        )}
      </div>
    );

  const mobileDrawer =
    mobileMenuOpen && typeof document !== 'undefined'
      ? createPortal(
          <div
            id="mobile-navigation-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Category navigation menu"
            className="fixed inset-0 z-50 lg:hidden flex"
          >
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-[1px]"
              aria-hidden="true"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Fluid Drawer Panel */}
            <aside className="relative z-10 w-[min(22rem,88vw)] max-w-full bg-white h-[100dvh] shadow-2xl flex flex-col overflow-hidden">
              {/* Drawer Header */}
              <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-[#E7E5E4] shrink-0">
                <div className="min-w-0">
                  <ZampaLogo size="sm" />
                  <p className="text-[11px] font-medium text-[#78716C] mt-0.5">
                    Browse categories
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-[#57534E] hover:bg-[#F5F5F4] hover:text-[#1C1917] transition-colors shrink-0"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Categories & Subcategories */}
              <div className="flex-1 overflow-y-auto overscroll-contain">
                <div className="p-3 border-b border-[#F5F5F4]">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onResetFilters();
                    }}
                    className="w-full min-h-[46px] flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#1C1917] text-white text-sm font-semibold hover:bg-[#C2410C] transition-colors"
                  >
                    <span className="flex items-center gap-2.5">
                      <LayoutGrid className="w-4 h-4" />
                      <span>Shop All Products</span>
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {megaCategories.length === 0 ? (
                  <div className="px-5 py-8 text-sm text-[#57534E] text-center">
                    Loading WooCommerce categories...
                  </div>
                ) : (
                  <div className="divide-y divide-[#F5F5F4]">
                    {megaCategories.map((cat) => {
                      const expanded = expandedMobileCat === cat.slug;
                      const subNodes = cat.subcategories || [];

                      return (
                        <div key={cat.id || cat.slug}>
                          <button
                            type="button"
                            aria-expanded={expanded}
                            onClick={() => {
                              setHasToggledMobileCat(true);
                              setExpandedMobileCat(expanded ? null : cat.slug);
                            }}
                            className={`w-full min-h-[52px] flex items-center justify-between gap-3 px-4 sm:px-5 py-3 text-sm font-semibold transition-colors text-left ${
                              expanded
                                ? 'bg-[#FAFAF9] text-[#C2410C]'
                                : 'text-[#1C1917] hover:bg-[#FAFAF9]'
                            }`}
                          >
                            <span className="flex items-center gap-3 min-w-0 flex-1">
                              <CategoryIcon
                                name={cat.iconName}
                                className={`w-4 h-4 shrink-0 ${
                                  expanded ? 'text-[#C2410C]' : 'text-[#57534E]'
                                }`}
                              />
                              <span className="break-words leading-snug">
                                {cat.name}
                              </span>
                            </span>
                            <span className="flex items-center gap-2 shrink-0">
                              {typeof cat.count === 'number' && (
                                <span className="text-xs font-medium text-[#78716C] tabular-nums">
                                  {cat.count}
                                </span>
                              )}
                              <ChevronDown
                                className={`w-4 h-4 text-[#78716C] transition-transform duration-150 ${
                                  expanded ? 'rotate-180 text-[#C2410C]' : ''
                                }`}
                              />
                            </span>
                          </button>

                          {expanded && (
                            <div className="bg-[#FAFAF9] px-3 sm:px-4 pb-3.5 pt-1 space-y-1">
                              <button
                                type="button"
                                onClick={() =>
                                  handleCategoryClick(cat.slug, undefined, cat.id)
                                }
                                className="w-full min-h-[44px] flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-bold text-[#C2410C] hover:bg-white transition-colors text-left"
                              >
                                <span>
                                  All {cat.name}
                                  {typeof cat.count === 'number' ? ` (${cat.count})` : ''}
                                </span>
                                <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                              </button>

                              {subNodes.length > 0 && (
                                <div className="space-y-0.5 pt-0.5">
                                  {renderMobileSubcategoryList(subNodes)}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Drawer Footer Quick Actions */}
              <div className="border-t border-[#E7E5E4] bg-[#FAFAF9] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] grid grid-cols-2 gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAccount();
                  }}
                  className="min-h-[44px] flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-[#E7E5E4] bg-white text-xs font-semibold text-[#1C1917] hover:border-[#D6D3D1] transition-colors"
                >
                  <User className="w-4 h-4 text-[#57534E]" />
                  <span>Account</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenCart();
                  }}
                  className="min-h-[44px] flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-[#1C1917] text-white text-xs font-semibold hover:bg-[#292524] transition-colors"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Cart ({cartCount})</span>
                </button>
              </div>
            </aside>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E7E5E4]">
        {/* Reassuring Top Bar */}
        <div className="bg-[#1C1917] text-[#FAFAF9] text-[11px] sm:text-xs py-2 px-4 overflow-hidden">
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
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-2 sm:gap-4 lg:gap-6 h-16 sm:h-20 min-w-0">
            {/* Mobile & Tablet menu trigger + Brand Logo */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-navigation-drawer"
                className="lg:hidden w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl border border-[#E7E5E4] flex items-center justify-center text-[#1C1917] hover:bg-[#F5F5F4] active:bg-[#E7E5E4]/60 transition-colors shrink-0"
                aria-label="Open category menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={onResetFilters}
                className="text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C2410C] rounded-lg min-w-0"
                aria-label="Back to Zampa Club home"
              >
                <span className="sm:hidden">
                  <ZampaLogo size="sm" />
                </span>
                <span className="hidden sm:inline">
                  <ZampaLogo size="md" />
                </span>
              </button>
            </div>

            {/* Central Wide Live Search Bar (Tablet & Desktop) */}
            <div ref={desktopSearchRef} className="hidden md:block flex-1 max-w-2xl min-w-0 relative">
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
                  placeholder="Search dog harnesses, cat trees, calming beds, water fountains..."
                  aria-label="Search products in catalog"
                  className="w-full pl-11 pr-10 py-2.5 rounded-xl bg-[#FAFAF9] border border-[#E7E5E4] text-sm text-[#1C1917] placeholder:text-[#78716C] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C2410C]/25 focus:border-[#C2410C] transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => onSearchChange('')}
                    className="absolute right-1.5 w-10 h-10 flex items-center justify-center text-[#78716C] hover:text-[#1C1917] rounded-lg"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {renderSearchSuggestions()}
            </div>

            {/* Right Actions: Account & Cart */}
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              <button
                type="button"
                onClick={onOpenAccount}
                className="inline-flex items-center justify-center gap-2 min-w-[44px] min-h-[44px] px-2.5 sm:px-3 py-2 rounded-xl border border-transparent hover:border-[#E7E5E4] hover:bg-[#FAFAF9] text-sm font-medium text-[#1C1917] transition-colors whitespace-nowrap"
                aria-label="Open account and pet profile"
              >
                <User className="w-5 h-5 text-[#57534E]" />
                <span className="hidden sm:inline">
                  {isAuthenticated ? user?.firstName || 'Account' : 'Account'}
                </span>
              </button>

              <button
                type="button"
                onClick={onOpenCart}
                className="relative inline-flex items-center justify-center gap-2 min-h-[44px] px-3 sm:px-3.5 py-2 rounded-xl bg-[#1C1917] hover:bg-[#292524] text-white text-sm font-semibold transition-colors whitespace-nowrap shadow-sm"
                aria-label={`Open cart, ${cartCount} items`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span className="hidden sm:inline">Cart</span>
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[#C2410C] text-white text-xs font-bold tabular-nums">
                  {cartCount}
                </span>
              </button>
            </div>
          </div>

          {/* Mobile Search Bar */}
          <div ref={mobileSearchRef} className="md:hidden pb-3 relative">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-[#78716C] absolute left-3.5 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onFocus={() => setSearchFocused(true)}
                onChange={(e) => {
                  onSearchChange(e.target.value);
                  setSearchFocused(true);
                }}
                placeholder="Search products for dogs, cats, travel, home..."
                aria-label="Search products"
                className="w-full pl-10 pr-11 py-2.5 min-h-[44px] rounded-xl bg-[#FAFAF9] border border-[#E7E5E4] text-base sm:text-sm text-[#1C1917] placeholder:text-[#78716C] focus:bg-white focus:outline-none focus:border-[#C2410C]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="absolute right-1.5 w-10 h-10 flex items-center justify-center text-[#78716C] hover:text-[#1C1917] rounded-lg"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {renderSearchSuggestions()}
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
                    ? 'bg-[#C2410C] text-white'
                    : 'bg-[#1C1917] text-white hover:bg-[#C2410C]'
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
                  className="absolute left-0 top-full pt-1.5 z-50 flex max-w-[calc(100vw-3rem)]"
                >
                  <div className="flex bg-white rounded-2xl border border-[#E7E5E4] shadow-2xl overflow-hidden max-w-full">
                    {/* Left Vertical List: Dynamic Macro Categories */}
                    <div className="w-56 xl:w-64 shrink-0 bg-[#FAFAF9] border-r border-[#E7E5E4] py-2 max-h-[70vh] overflow-y-auto">
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
                                ? 'bg-white text-[#C2410C] font-semibold shadow-[inset_3px_0_0_#C2410C]'
                                : 'text-[#1C1917] hover:bg-white/70 font-medium'
                            }`}
                          >
                            <span className="flex items-center gap-2.5 min-w-0">
                              <CategoryIcon
                                name={cat.iconName}
                                className={`w-4 h-4 shrink-0 ${
                                  isActive ? 'text-[#C2410C]' : 'text-[#57534E]'
                                }`}
                              />
                              <span className="truncate">{cat.name}</span>
                            </span>
                            <ChevronRight
                              className={`w-4 h-4 shrink-0 ${
                                isActive ? 'text-[#C2410C]' : 'text-[#78716C]'
                              }`}
                            />
                          </button>
                        );
                      })}
                    </div>

                    {/* Right Flyout Panel: Subcategory Columns + Featured Product Card */}
                    <div className="w-[min(680px,calc(100vw-19rem))] p-6 bg-white flex flex-col justify-between gap-5">
                      <div>
                        <div className="flex items-baseline justify-between gap-4 border-b border-[#F5F5F4] pb-3 mb-4">
                          <div className="min-w-0">
                            <h3 className="font-display text-lg font-bold text-[#1C1917] truncate">
                              {activeMegaCategory.name}
                            </h3>
                            <p className="text-xs text-[#57534E] truncate">
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
                            className="text-xs font-semibold text-[#C2410C] hover:text-[#9A3412] whitespace-nowrap shrink-0"
                          >
                            Shop all {activeMegaCategory.name} →
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                          {activeMegaCategory.columns.map((col) => (
                            <div key={col.heading} className="space-y-2.5 min-w-0">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-[#78716C]">
                                {col.heading}
                              </h4>
                              <ul className="space-y-1.5">
                                {col.links.map((lnk, idx) => (
                                  <li key={`${lnk.categoryId || ''}-${lnk.label}-${idx}`}>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleCategoryClick(
                                          lnk.categorySlug || activeMegaCategory.slug,
                                          lnk.filterTerm,
                                          lnk.categoryId || activeMegaCategory.id
                                        )
                                      }
                                      className="text-sm text-[#1C1917] hover:text-[#C2410C] hover:translate-x-0.5 transition-all text-left break-words"
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
                          <div className="w-20 h-20 aspect-square rounded-lg overflow-hidden border border-[#E7E5E4] shrink-0 bg-white p-1.5">
                            <ResilientImage
                              src={featuredFlyoutProduct.images[0]}
                              alt={featuredFlyoutProduct.name}
                              loading="lazy"
                              decoding="async"
                              width={80}
                              height={80}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#0F766E]">
                              Featured · {activeMegaCategory.name}
                            </div>
                            <div className="text-sm font-bold text-[#1C1917] truncate">
                              {featuredFlyoutProduct.name}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-sm font-bold text-[#C2410C] tabular-nums">
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
                            className="px-3.5 py-2 rounded-lg bg-[#C2410C] hover:bg-[#9A3412] text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
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
            <div className="flex items-center gap-6 text-sm font-medium text-[#57534E] overflow-x-auto min-w-0">
              <button
                type="button"
                onClick={onResetFilters}
                className="hover:text-[#C2410C] transition-colors whitespace-nowrap shrink-0"
              >
                Shop All
              </button>
              {quickNavCategories.map((item) => (
                <button
                  key={item.id || item.slug}
                  type="button"
                  onClick={() => handleCategoryClick(item.slug, undefined, item.id)}
                  className="hover:text-[#C2410C] transition-colors whitespace-nowrap shrink-0"
                >
                  {item.name}
                </button>
              ))}
            </div>
          </nav>
        </div>
      </header>
      {mobileDrawer}
    </>
  );
}
