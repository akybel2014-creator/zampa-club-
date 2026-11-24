import { useEffect, useMemo, useState } from 'react';
import { AccountModal } from './components/AccountModal';
import { CartDrawer } from './components/CartDrawer';
import { CatalogSection } from './components/CatalogSection';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { ProductModal } from './components/ProductModal';
import { QuickCategories } from './components/QuickCategories';
import { WhyZampaAndReviews } from './components/WhyZampaAndReviews';
import { STATIC_WOO_CATEGORIES } from './data/categories';
import {
  buildMegaCategoriesFromWoo,
  fetchCatalogProducts,
  fetchWooCategories,
  findCategoryBySlugOrAlias,
  getDescendantCategoryIds,
} from './services/wooCommerceService';
import {
  CartItem,
  MacroCategorySlug,
  Product,
  ProductVariation,
  SortOption,
  WooCategory,
} from './types/shop';

export default function App() {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [categoryProductsState, setCategoryProductsState] = useState<{
    categoryId: number;
    products: Product[];
  } | null>(null);
  const [wooCategories, setWooCategories] = useState<WooCategory[]>(STATIC_WOO_CATEGORIES);
  const [sourceMode, setSourceMode] = useState<'woocommerce' | 'fallback'>('fallback');
  const [categorySourceMode, setCategorySourceMode] =
    useState<'woocommerce' | 'fallback'>('fallback');
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  const [activeTab, setActiveTab] = useState<string>('all');
  const [activeMacroCategory, setActiveMacroCategory] =
    useState<MacroCategorySlug | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const [activeSubFilter, setActiveSubFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('popular');

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('zampaclub_cart_v1');
      return saved ? (JSON.parse(saved) as CartItem[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('zampaclub_cart_v1', JSON.stringify(cartItems));
    } catch {
      // Ignore storage quota errors in restricted frames
    }
  }, [cartItems]);

  useEffect(() => {
    let active = true;
    Promise.all([fetchCatalogProducts(), fetchWooCategories()]).then(
      ([prodRes, catRes]) => {
        if (!active) return;
        setAllProducts(prodRes.products);
        setSourceMode(prodRes.source);
        setWooCategories(catRes.categories);
        setCategorySourceMode(catRes.source);
        setLoadingCatalog(false);
      }
    );
    return () => {
      active = false;
    };
  }, []);

  // When a live WooCommerce category ID is selected, fetch /wp-json/wc/v3/products?category=...
  useEffect(() => {
    if (!activeCategoryId || sourceMode !== 'woocommerce') {
      setCategoryProductsState(null);
      return;
    }

    let active = true;
    const requestedId = activeCategoryId;
    fetchCatalogProducts(requestedId).then((res) => {
      if (!active) return;
      if (res.source === 'woocommerce') {
        setCategoryProductsState({
          categoryId: requestedId,
          products: res.products,
        });
      }
    });
    return () => {
      active = false;
    };
  }, [activeCategoryId, sourceMode]);

  const megaCategories = useMemo(
    () => buildMegaCategoriesFromWoo(wooCategories, categorySourceMode, allProducts),
    [wooCategories, categorySourceMode, allProducts]
  );

  const scrollToCatalog = () => {
    const el = document.getElementById('product-catalog');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const resolveCategoryId = (
    slug: MacroCategorySlug,
    explicitId?: number
  ): number | null => {
    if (explicitId) return explicitId;
    const match = findCategoryBySlugOrAlias(wooCategories, slug);
    return match ? match.id : null;
  };

  const handleSelectCategory = (
    slug: MacroCategorySlug,
    subFilter?: string,
    categoryId?: number
  ) => {
    const resolvedId = resolveCategoryId(slug, categoryId);
    setActiveMacroCategory(slug);
    setActiveCategoryId(resolvedId);
    setActiveSubFilter(subFilter || null);
    setActiveTab('all');
    scrollToCatalog();
  };

  const handleChangeTab = (tabSlug: string, categoryId?: number) => {
    setActiveMacroCategory(null);
    setActiveSubFilter(null);
    setActiveCategoryId(categoryId || null);
    setActiveTab(tabSlug);
  };

  const handleResetFilters = () => {
    setActiveMacroCategory(null);
    setActiveCategoryId(null);
    setActiveSubFilter(null);
    setActiveTab('all');
    setSearchQuery('');
    setCategoryProductsState(null);
  };

  const handleAddToCart = (
    product: Product,
    variation: ProductVariation,
    quantity: number
  ) => {
    const cartKey = `${product.id}-${variation.variation_id}`;
    setCartItems((prev) => {
      const existing = prev.find((item) => item.cartKey === cartKey);
      if (existing) {
        return prev.map((item) =>
          item.cartKey === cartKey
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { cartKey, product, variation, quantity }];
    });
    setCartOpen(true);
  };

  const handleQuickAdd = (product: Product) => {
    const defaultVar =
      product.variations.find(
        (v) => v.variation_id === product.default_variation_id
      ) || product.variations[0];
    const cartKey = `${product.id}-${defaultVar.variation_id}`;
    setCartItems((prev) => {
      const existing = prev.find((item) => item.cartKey === cartKey);
      if (existing) {
        return prev.map((item) =>
          item.cartKey === cartKey
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { cartKey, product, variation: defaultVar, quantity: 1 }];
    });
  };

  const handleUpdateQty = (cartKey: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) =>
          item.cartKey === cartKey
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const handleRemoveItem = (cartKey: string) => {
    setCartItems((prev) => prev.filter((item) => item.cartKey !== cartKey));
  };

  const filteredProducts = useMemo(() => {
    const hasMatchingCategoryProducts =
      activeCategoryId !== null &&
      categoryProductsState !== null &&
      categoryProductsState.categoryId === activeCategoryId;

    let list = hasMatchingCategoryProducts
      ? [...categoryProductsState.products]
      : [...allProducts];

    // Special virtual tabs/categories
    if (activeMacroCategory === 'new-arrivals') {
      list = list.filter((p) => p.is_new);
    } else if (
      activeMacroCategory === 'deals' ||
      activeTab === 'deals' ||
      activeSubFilter === 'ON_SALE'
    ) {
      list = list.filter((p) => p.regular_price && p.regular_price > p.price);
    } else if (activeCategoryId) {
      // Include both direct category ID and all child subcategory IDs
      const matchingIds = getDescendantCategoryIds(activeCategoryId, wooCategories);
      list = list.filter((p) =>
        p.categoryIds.some((id) => matchingIds.has(id))
      );
    } else if (activeMacroCategory) {
      const aliasCat = findCategoryBySlugOrAlias(wooCategories, activeMacroCategory);
      if (aliasCat) {
        const matchingIds = getDescendantCategoryIds(aliasCat.id, wooCategories);
        list = list.filter((p) =>
          p.categoryIds.some((id) => matchingIds.has(id))
        );
      } else {
        list = list.filter(
          (p) =>
            p.categorySlug === activeMacroCategory ||
            p.categories.some((c) => c.slug === activeMacroCategory) ||
            (activeSubFilter && p.subcategories.includes(activeSubFilter))
        );
      }
    } else if (activeTab !== 'all') {
      list = list.filter(
        (p) =>
          p.categorySlug === activeTab ||
          p.categories.some((c) => c.slug === activeTab)
      );
    }

    // Subcategory refinement from Mega Menu flyout or subcategory filter strip
    if (activeSubFilter && activeSubFilter !== 'ON_SALE') {
      const subLower = activeSubFilter.toLowerCase();
      list = list.filter((p) =>
        p.subcategories.some((s) => s.toLowerCase() === subLower)
      );
    }

    // Search query
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.categoryLabel.toLowerCase().includes(q) ||
          p.subcategories.some((s) => s.toLowerCase().includes(q)) ||
          p.short_description.toLowerCase().includes(q)
      );
    }

    // Sorting
    list.sort((a, b) => {
      switch (sortBy) {
        case 'price-asc':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        case 'rating':
          return b.rating - a.rating || b.reviews_count - a.reviews_count;
        case 'popular':
        default:
          return b.sales_count - a.sales_count;
      }
    });

    return list;
  }, [
    allProducts,
    categoryProductsState,
    wooCategories,
    activeCategoryId,
    activeMacroCategory,
    activeTab,
    activeSubFilter,
    searchQuery,
    sortBy,
  ]);

  const totalCartCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF9] text-[#1C1917]">
      <Header
        products={allProducts}
        megaCategories={megaCategories}
        cartCount={totalCartCount}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSelectCategory={handleSelectCategory}
        onSelectProduct={setSelectedProduct}
        onOpenCart={() => setCartOpen(true)}
        onOpenAccount={() => setAccountOpen(true)}
        onResetFilters={handleResetFilters}
      />

      <main className="flex-1">
        <HeroSection
          onExploreBestSellers={() => {
            handleResetFilters();
            setSortBy('popular');
            scrollToCatalog();
          }}
          onSelectCategory={(slug) => handleSelectCategory(slug)}
        />

        <QuickCategories
          wooCategories={wooCategories}
          sourceMode={categorySourceMode}
          activeCategorySlug={activeMacroCategory}
          activeCategoryId={activeCategoryId}
          onSelectCategory={handleSelectCategory}
        />

        <CatalogSection
          products={filteredProducts}
          allProducts={allProducts}
          wooCategories={wooCategories}
          loading={loadingCatalog}
          activeTab={activeTab}
          activeMacroCategory={activeMacroCategory}
          activeCategoryId={activeCategoryId}
          activeSubFilter={activeSubFilter}
          searchQuery={searchQuery}
          sortBy={sortBy}
          onChangeTab={handleChangeTab}
          onSelectCategory={handleSelectCategory}
          onChangeSort={setSortBy}
          onResetFilters={handleResetFilters}
          onOpenProduct={setSelectedProduct}
          onQuickAdd={handleQuickAdd}
        />

        <WhyZampaAndReviews />
      </main>

      <Footer
        wooCategories={wooCategories}
        onSelectCategory={handleSelectCategory}
        onOpenAccount={() => setAccountOpen(true)}
      />

      <ProductModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
      />

      <CartDrawer
        isOpen={cartOpen}
        items={cartItems}
        onClose={() => setCartOpen(false)}
        onUpdateQty={handleUpdateQty}
        onRemoveItem={handleRemoveItem}
        onOpenAccountConfig={() => {
          setCartOpen(false);
          setAccountOpen(true);
        }}
      />

      <AccountModal
        isOpen={accountOpen}
        onClose={() => setAccountOpen(false)}
        sourceMode={sourceMode}
        categorySourceMode={categorySourceMode}
        productCount={allProducts.length}
        categoryCount={wooCategories.length}
      />
    </div>
  );
}
