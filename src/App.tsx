import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { QuickCategories } from './components/QuickCategories';
import { useCart } from './context/CartContext';
import {
  buildMegaCategoriesFromWoo,
  clearWooCommerceCache,
  fetchCatalogProducts,
  fetchWooCategories,
  findCategoryBySlugOrAlias,
  getCachedCatalogSnapshot,
  getDescendantCategoryIds,
  getRateLimitRemainingSeconds,
} from './services/wooCommerceService';
import {
  MacroCategorySlug,
  Product,
  ProductVariation,
  SortOption,
  WooCategory,
} from './types/shop';

const CatalogSection = lazy(() =>
  import('./components/CatalogSection').then((m) => ({ default: m.CatalogSection }))
);
const WhyZampaAndReviews = lazy(() =>
  import('./components/WhyZampaAndReviews').then((m) => ({
    default: m.WhyZampaAndReviews,
  }))
);
const Footer = lazy(() =>
  import('./components/Footer').then((m) => ({ default: m.Footer }))
);
const ProductModal = lazy(() =>
  import('./components/ProductModal').then((m) => ({ default: m.ProductModal }))
);
const CartDrawer = lazy(() =>
  import('./components/CartDrawer').then((m) => ({ default: m.CartDrawer }))
);
const AccountModal = lazy(() =>
  import('./components/AccountModal').then((m) => ({ default: m.AccountModal }))
);

export type ConnectionStatus = 'loading' | 'woocommerce' | 'error';

export default function App() {
  const [initialCache] = useState(() => getCachedCatalogSnapshot());
  const hasWarmCache = Boolean(
    initialCache.products &&
      initialCache.products.length > 0 &&
      initialCache.categories &&
      initialCache.categories.length > 0
  );

  const [allProducts, setAllProducts] = useState<Product[]>(
    () => initialCache.products || []
  );
  const [wooCategories, setWooCategories] = useState<WooCategory[]>(
    () => initialCache.categories || []
  );
  const [sourceMode, setSourceMode] = useState<ConnectionStatus>(() =>
    initialCache.products ? 'woocommerce' : 'loading'
  );
  const [categorySourceMode, setCategorySourceMode] = useState<ConnectionStatus>(() =>
    initialCache.categories ? 'woocommerce' : 'loading'
  );
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(() => !hasWarmCache);

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

  const {
    cartItems,
    cartToken,
    addToCart,
    updateQuantity,
    removeItem,
    clearCart,
    syncCart,
  } = useCart();

  const lastManualRefreshRef = useRef(0);
  const didInitialCartSyncRef = useRef(false);

  const loadWooCommerceData = useCallback(async (forceRefresh = false) => {
    const cooldownSec = getRateLimitRemainingSeconds();
    if (cooldownSec > 0) {
      setCatalogError(
        `WooCommerce rate limit cooldown active. Please wait ${cooldownSec}s before retrying.`
      );
      return;
    }

    if (forceRefresh) {
      const now = Date.now();
      if (now - lastManualRefreshRef.current < 3000) {
        return;
      }
      lastManualRefreshRef.current = now;
      clearWooCommerceCache();
    }

    setLoadingCatalog(true);
    setCatalogError(null);

    const [prodRes, catRes] = await Promise.all([
      fetchCatalogProducts(forceRefresh),
      fetchWooCategories(forceRefresh),
    ]);

    setAllProducts(prodRes.products);
    setSourceMode(prodRes.source);
    setWooCategories(catRes.categories);
    setCategorySourceMode(catRes.source);

    if (prodRes.source === 'error') {
      setCatalogError(
        prodRes.message || 'Unable to load products from WooCommerce.'
      );
    } else if (catRes.source === 'error') {
      setCatalogError(
        catRes.message || 'Unable to load categories from WooCommerce.'
      );
    }

    setLoadingCatalog(false);
  }, []);

  useEffect(() => {
    if (hasWarmCache) {
      return;
    }

    let active = true;
    let rafId = 0;
    let timerId = 0;

    // Defer WooCommerce network calls until after first paint so Hero & critical UI render immediately
    rafId = window.requestAnimationFrame(() => {
      timerId = window.setTimeout(() => {
        if (!active) return;
        Promise.all([fetchCatalogProducts(), fetchWooCategories()]).then(
          ([prodRes, catRes]) => {
            if (!active) return;
            setAllProducts(prodRes.products);
            setSourceMode(prodRes.source);
            setWooCategories(catRes.categories);
            setCategorySourceMode(catRes.source);

            if (prodRes.source === 'error') {
              setCatalogError(
                prodRes.message || 'Unable to load products from WooCommerce.'
              );
            } else if (catRes.source === 'error') {
              setCatalogError(
                catRes.message || 'Unable to load categories from WooCommerce.'
              );
            }

            setLoadingCatalog(false);
          }
        );
      }, 0);
    });

    return () => {
      active = false;
      if (rafId) window.cancelAnimationFrame(rafId);
      if (timerId) window.clearTimeout(timerId);
    };
  }, [hasWarmCache]);

  useEffect(() => {
    if (sourceMode !== 'error' && categorySourceMode !== 'error') return;
    const handleOnline = () => {
      if (getRateLimitRemainingSeconds() > 0) return;
      loadWooCommerceData(false);
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [sourceMode, categorySourceMode, loadWooCommerceData]);

  useEffect(() => {
    if (didInitialCartSyncRef.current) return;
    if (!cartToken) return;
    if (loadingCatalog) return;
    didInitialCartSyncRef.current = true;
    const timerId = window.setTimeout(() => {
      syncCart(allProducts);
    }, 300);
    return () => window.clearTimeout(timerId);
  }, [cartToken, loadingCatalog, allProducts, syncCart]);

  const megaCategories = useMemo(
    () => buildMegaCategoriesFromWoo(wooCategories, allProducts),
    [wooCategories, allProducts]
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
  };

  const handleOpenCart = useCallback(() => {
    setCartOpen(true);
    if (!didInitialCartSyncRef.current) {
      didInitialCartSyncRef.current = true;
      syncCart(allProducts);
    }
  }, [allProducts, syncCart]);

  const handleAddToCart = (
    product: Product,
    variation: ProductVariation,
    quantity: number
  ) => {
    addToCart(product, variation, quantity);
    setCartOpen(true);
  };

  const handleQuickAdd = (product: Product) => {
    const defaultVar =
      product.variations.find(
        (v) => v.variation_id === product.default_variation_id
      ) || product.variations[0];
    if (!defaultVar) return;
    addToCart(product, defaultVar, 1);
  };

  const handleUpdateQty = (cartKey: string, delta: number) => {
    updateQuantity(cartKey, delta);
  };

  const handleRemoveItem = (cartKey: string) => {
    removeItem(cartKey);
  };

  const filteredProducts = useMemo(() => {
    let list = [...allProducts];

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
        onOpenCart={handleOpenCart}
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
          loading={loadingCatalog}
          activeCategorySlug={activeMacroCategory}
          activeCategoryId={activeCategoryId}
          onSelectCategory={handleSelectCategory}
        />

        <Suspense
          fallback={
            <section
              id="product-catalog"
              className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-[420px]"
            />
          }
        >
          <CatalogSection
            products={filteredProducts}
            allProducts={allProducts}
            wooCategories={wooCategories}
            loading={loadingCatalog}
            errorMessage={catalogError}
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
            onRetry={() => loadWooCommerceData(true)}
            onOpenProduct={setSelectedProduct}
            onQuickAdd={handleQuickAdd}
          />
        </Suspense>

        <Suspense fallback={null}>
          <WhyZampaAndReviews />
        </Suspense>
      </main>

      <Suspense fallback={null}>
        <Footer
          wooCategories={wooCategories}
          onSelectCategory={handleSelectCategory}
          onOpenAccount={() => setAccountOpen(true)}
        />
      </Suspense>

      {selectedProduct && (
        <Suspense fallback={null}>
          <ProductModal
            product={selectedProduct}
            onClose={() => setSelectedProduct(null)}
            onAddToCart={handleAddToCart}
          />
        </Suspense>
      )}

      {cartOpen && (
        <Suspense fallback={null}>
          <CartDrawer
            isOpen={cartOpen}
            items={cartItems}
            onClose={() => setCartOpen(false)}
            onUpdateQty={handleUpdateQty}
            onRemoveItem={handleRemoveItem}
            onClearCart={() => clearCart(true)}
          />
        </Suspense>
      )}

      {accountOpen && (
        <Suspense fallback={null}>
          <AccountModal
            isOpen={accountOpen}
            onClose={() => setAccountOpen(false)}
            sourceMode={sourceMode}
            categorySourceMode={categorySourceMode}
            productCount={allProducts.length}
            categoryCount={wooCategories.length}
          />
        </Suspense>
      )}
    </div>
  );
}
