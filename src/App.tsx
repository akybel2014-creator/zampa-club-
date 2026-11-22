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
import { fetchCatalogProducts } from './services/wooCommerceService';
import {
  CartItem,
  MacroCategorySlug,
  Product,
  ProductVariation,
  QuickFilterTab,
  SortOption,
} from './types/shop';

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [sourceMode, setSourceMode] = useState<'woocommerce' | 'fallback'>('fallback');
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  const [activeTab, setActiveTab] = useState<QuickFilterTab>('tutti');
  const [activeMacroCategory, setActiveMacroCategory] =
    useState<MacroCategorySlug | null>(null);
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
    fetchCatalogProducts().then((res) => {
      if (!active) return;
      setProducts(res.products);
      setSourceMode(res.source);
      setLoadingCatalog(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const scrollToCatalog = () => {
    const el = document.getElementById('catalogo-prodotti');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSelectCategory = (slug: MacroCategorySlug, subFilter?: string) => {
    setActiveMacroCategory(slug);
    setActiveSubFilter(subFilter || null);
    setActiveTab('tutti');
    scrollToCatalog();
  };

  const handleChangeTab = (tab: QuickFilterTab) => {
    setActiveMacroCategory(null);
    setActiveSubFilter(null);
    setActiveTab(tab);
  };

  const handleResetFilters = () => {
    setActiveMacroCategory(null);
    setActiveSubFilter(null);
    setActiveTab('tutti');
    setSearchQuery('');
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
    let list = [...products];

    // Macro category from Mega Menu / Quick Categories / Hero
    if (activeMacroCategory) {
      if (activeMacroCategory === 'novita') {
        list = list.filter((p) => p.is_new);
      } else if (activeMacroCategory === 'offerte') {
        list = list.filter((p) => p.regular_price && p.regular_price > p.price);
      } else {
        list = list.filter(
          (p) =>
            p.categorySlug === activeMacroCategory ||
            (activeSubFilter && p.subcategories.includes(activeSubFilter))
        );
      }
    } else if (activeTab !== 'tutti') {
      if (activeTab === 'offerte') {
        list = list.filter((p) => p.regular_price && p.regular_price > p.price);
      } else {
        list = list.filter((p) => p.categorySlug === activeTab);
      }
    }

    // Subcategory refinement from Mega Menu flyout
    if (activeSubFilter && activeSubFilter !== 'IN_OFFERTA') {
      const subLower = activeSubFilter.toLowerCase();
      const subMatches = list.filter((p) =>
        p.subcategories.some((s) => s.toLowerCase() === subLower)
      );
      if (subMatches.length > 0) {
        list = subMatches;
      }
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
    products,
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
        products={products}
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
          activeCategorySlug={activeMacroCategory}
          onSelectCategory={(slug) => handleSelectCategory(slug)}
        />

        <CatalogSection
          products={filteredProducts}
          loading={loadingCatalog}
          activeTab={activeTab}
          activeMacroCategory={activeMacroCategory}
          activeSubFilter={activeSubFilter}
          searchQuery={searchQuery}
          sortBy={sortBy}
          onChangeTab={handleChangeTab}
          onChangeSort={setSortBy}
          onResetFilters={handleResetFilters}
          onOpenProduct={setSelectedProduct}
          onQuickAdd={handleQuickAdd}
        />

        <WhyZampaAndReviews />
      </main>

      <Footer
        onSelectCategory={(slug) => handleSelectCategory(slug)}
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
        productCount={products.length}
      />
    </div>
  );
}
