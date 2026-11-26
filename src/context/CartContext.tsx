import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  addWooCartItem,
  clearStoredCartSession,
  fetchWooCartSession,
  getRateLimitRemainingSeconds,
  getStoredCartToken,
  removeWooCartItem,
  submitWooCommerceCheckout,
  updateWooCartItem,
  WooCheckoutBilling,
  WooCheckoutResult,
  WooStoreCartPayload,
} from '../services/wooCommerceService';
import { CartItem, Product, ProductVariation } from '../types/shop';

const CART_STORAGE_KEY = 'zampaclub_cart_v1';

interface CartContextValue {
  cartItems: CartItem[];
  cartToken: string;
  syncingCart: boolean;
  cartSyncNotice: string | null;
  addToCart: (
    product: Product,
    variation: ProductVariation,
    quantity?: number
  ) => void;
  updateQuantity: (cartKey: string, delta: number) => void;
  removeItem: (cartKey: string) => void;
  clearCart: (clearSession?: boolean) => void;
  syncCart: (catalogProducts?: Product[]) => Promise<void>;
  checkout: (
    billing: WooCheckoutBilling,
    paymentMethod?: 'cod' | 'woocommerce_payments'
  ) => Promise<WooCheckoutResult>;
}

const CartContext = createContext<CartContextValue | null>(null);

function resolveItemIds(product: Product, variation: ProductVariation): {
  id: number;
  variationId?: number;
  storeItemId: number;
} {
  const hasVariationId =
    product.hasVariations !== false &&
    Boolean(variation?.variation_id) &&
    variation.variation_id !== product.id;
  return {
    id: product.id,
    variationId: hasVariationId ? variation.variation_id : undefined,
    storeItemId: hasVariationId ? variation.variation_id : product.id,
  };
}

function readPersistedCartItems(): CartItem[] {
  try {
    const saved = localStorage.getItem(CART_STORAGE_KEY);
    return saved ? (JSON.parse(saved) as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>(readPersistedCartItems);
  const [cartToken, setCartToken] = useState<string>(getStoredCartToken);
  const [syncingCart, setSyncingCart] = useState(false);
  const [cartSyncNotice, setCartSyncNotice] = useState<string | null>(null);

  const cartItemsRef = useRef(cartItems);
  cartItemsRef.current = cartItems;

  const mutationChainRef = useRef<Promise<void>>(Promise.resolve());
  const qtyDebounceTimersRef = useRef<Map<string, number>>(new Map());
  const pendingMutationsRef = useRef(0);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    } catch {
      // Ignore storage quota errors in restricted frames
    }
  }, [cartItems]);

  const applyRemoteCartSnapshot = useCallback(
    (
      remoteCart: WooStoreCartPayload | null | undefined,
      nextToken?: string,
      catalogProducts?: Product[]
    ) => {
      if (nextToken) {
        setCartToken(nextToken);
      }
      if (!remoteCart || !Array.isArray(remoteCart.items)) {
        return;
      }

      const keyByStoreId = new Map<number, string>();
      for (const remoteItem of remoteCart.items) {
        if (remoteItem.id && remoteItem.key) {
          keyByStoreId.set(remoteItem.id, remoteItem.key);
        }
      }

      setCartItems((prev) => {
        if (prev.length === 0 && remoteCart.items && remoteCart.items.length > 0 && catalogProducts && catalogProducts.length > 0) {
          const hydrated: CartItem[] = [];
          for (const remoteItem of remoteCart.items) {
            for (const product of catalogProducts) {
              if (product.id === remoteItem.id) {
                const variation =
                  product.variations.find(
                    (v) => v.variation_id === product.default_variation_id
                  ) || product.variations[0];
                if (variation) {
                  hydrated.push({
                    cartKey: `${product.id}-${variation.variation_id}`,
                    wooCartKey: remoteItem.key,
                    product,
                    variation,
                    quantity: remoteItem.quantity || 1,
                  });
                }
                break;
              }
              const matchedVar = product.variations.find(
                (v) => v.variation_id === remoteItem.id
              );
              if (matchedVar) {
                hydrated.push({
                  cartKey: `${product.id}-${matchedVar.variation_id}`,
                  wooCartKey: remoteItem.key,
                  product,
                  variation: matchedVar,
                  quantity: remoteItem.quantity || 1,
                });
                break;
              }
            }
          }
          if (hydrated.length > 0) {
            return hydrated;
          }
        }

        let changed = false;
        const updated = prev.map((localItem) => {
          const { storeItemId } = resolveItemIds(localItem.product, localItem.variation);
          const remoteKey = keyByStoreId.get(storeItemId);
          if (remoteKey && remoteKey !== localItem.wooCartKey) {
            changed = true;
            return { ...localItem, wooCartKey: remoteKey };
          }
          return localItem;
        });

        return changed ? updated : prev;
      });
    },
    []
  );

  const enqueueCartMutation = useCallback((task: () => Promise<void>) => {
    pendingMutationsRef.current += 1;
    setSyncingCart(true);

    mutationChainRef.current = mutationChainRef.current
      .then(task)
      .catch(() => {
        // Keep queue alive across unexpected network errors
      })
      .finally(() => {
        pendingMutationsRef.current = Math.max(0, pendingMutationsRef.current - 1);
        if (pendingMutationsRef.current === 0) {
          setSyncingCart(false);
        }
      });
  }, []);

  const syncCart = useCallback(
    async (catalogProducts?: Product[]) => {
      if (getRateLimitRemainingSeconds() > 0) return;

      setSyncingCart(true);
      const res = await fetchWooCartSession();
      if (res.cartToken) {
        setCartToken(res.cartToken);
      }
      if (res.ok) {
        setCartSyncNotice(null);
        applyRemoteCartSnapshot(res.cart, res.cartToken, catalogProducts);
      } else if (res.error) {
        setCartSyncNotice(res.error);
      }
      if (pendingMutationsRef.current === 0) {
        setSyncingCart(false);
      }
    },
    [applyRemoteCartSnapshot]
  );

  const addToCart = useCallback(
    (product: Product, variation: ProductVariation, quantity = 1) => {
      const safeQty = Math.min(Math.max(1, quantity), 99);
      const cartKey = `${product.id}-${variation.variation_id}`;

      setCartItems((prev) => {
        const existing = prev.find((item) => item.cartKey === cartKey);
        if (existing) {
          return prev.map((item) =>
            item.cartKey === cartKey
              ? { ...item, quantity: Math.min(item.quantity + safeQty, 99) }
              : item
          );
        }
        return [...prev, { cartKey, product, variation, quantity: safeQty }];
      });

      const { id, variationId } = resolveItemIds(product, variation);
      enqueueCartMutation(async () => {
        const res = await addWooCartItem({
          id,
          quantity: safeQty,
          ...(variationId ? { variation_id: variationId } : {}),
        });
        if (res.cartToken) setCartToken(res.cartToken);
        if (res.ok) {
          setCartSyncNotice(null);
          applyRemoteCartSnapshot(res.cart, res.cartToken);
        } else if (res.error) {
          setCartSyncNotice(res.error);
        }
      });
    },
    [applyRemoteCartSnapshot, enqueueCartMutation]
  );

  const updateQuantity = useCallback(
    (cartKey: string, delta: number) => {
      const currentItem = cartItemsRef.current.find((item) => item.cartKey === cartKey);
      if (!currentItem) return;

      const nextQty = Math.min(currentItem.quantity + delta, 99);

      setCartItems((prev) =>
        prev
          .map((item) =>
            item.cartKey === cartKey ? { ...item, quantity: nextQty } : item
          )
          .filter((item) => item.quantity > 0)
      );

      const existingTimer = qtyDebounceTimersRef.current.get(cartKey);
      if (existingTimer) {
        window.clearTimeout(existingTimer);
      }

      const { id, variationId } = resolveItemIds(
        currentItem.product,
        currentItem.variation
      );

      const timerId = window.setTimeout(() => {
        qtyDebounceTimersRef.current.delete(cartKey);
        const latestItem = cartItemsRef.current.find((i) => i.cartKey === cartKey);
        const targetWooKey = latestItem?.wooCartKey || currentItem.wooCartKey;

        enqueueCartMutation(async () => {
          const res =
            nextQty <= 0
              ? await removeWooCartItem({
                  key: targetWooKey,
                  id,
                  ...(variationId ? { variation_id: variationId } : {}),
                })
              : await updateWooCartItem({
                  key: targetWooKey,
                  id,
                  ...(variationId ? { variation_id: variationId } : {}),
                  quantity: nextQty,
                });

          if (res.cartToken) setCartToken(res.cartToken);
          if (res.ok) {
            setCartSyncNotice(null);
            applyRemoteCartSnapshot(res.cart, res.cartToken);
          } else if (res.error) {
            setCartSyncNotice(res.error);
          }
        });
      }, 350);

      qtyDebounceTimersRef.current.set(cartKey, timerId);
    },
    [applyRemoteCartSnapshot, enqueueCartMutation]
  );

  const removeItem = useCallback(
    (cartKey: string) => {
      const existingTimer = qtyDebounceTimersRef.current.get(cartKey);
      if (existingTimer) {
        window.clearTimeout(existingTimer);
        qtyDebounceTimersRef.current.delete(cartKey);
      }

      const currentItem = cartItemsRef.current.find((item) => item.cartKey === cartKey);
      setCartItems((prev) => prev.filter((item) => item.cartKey !== cartKey));

      if (!currentItem) return;
      const { id, variationId } = resolveItemIds(
        currentItem.product,
        currentItem.variation
      );

      enqueueCartMutation(async () => {
        const res = await removeWooCartItem({
          key: currentItem.wooCartKey,
          id,
          ...(variationId ? { variation_id: variationId } : {}),
        });
        if (res.cartToken) setCartToken(res.cartToken);
        if (res.ok) {
          setCartSyncNotice(null);
          applyRemoteCartSnapshot(res.cart, res.cartToken);
        } else if (res.error) {
          setCartSyncNotice(res.error);
        }
      });
    },
    [applyRemoteCartSnapshot, enqueueCartMutation]
  );

  const clearCart = useCallback((clearSession = false) => {
    qtyDebounceTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    qtyDebounceTimersRef.current.clear();
    setCartItems([]);
    setCartSyncNotice(null);
    if (clearSession) {
      clearStoredCartSession();
      setCartToken('');
    }
  }, []);

  const checkout = useCallback(
    async (
      billing: WooCheckoutBilling,
      paymentMethod: 'cod' | 'woocommerce_payments' = 'woocommerce_payments'
    ): Promise<WooCheckoutResult> => {
      // Wait briefly for any queued cart mutations before submitting checkout
      await mutationChainRef.current.catch(() => undefined);
      const res = await submitWooCommerceCheckout(
        cartItemsRef.current,
        billing,
        paymentMethod
      );
      if (res.cartToken) {
        setCartToken(res.cartToken);
      }
      return res;
    },
    []
  );

  useEffect(() => {
    const timers = qtyDebounceTimersRef.current;
    return () => {
      timers.forEach((timerId) => window.clearTimeout(timerId));
      timers.clear();
    };
  }, []);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        cartToken,
        syncingCart,
        cartSyncNotice,
        addToCart,
        updateQuantity,
        removeItem,
        clearCart,
        syncCart,
        checkout,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return ctx;
}
