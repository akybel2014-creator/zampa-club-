export type MacroCategorySlug = string;

export type SortOption = 'popular' | 'price-asc' | 'price-desc' | 'rating';

export interface WooCategory {
  id: number;
  name: string;
  slug: string;
  parent: number;
  count: number;
  image?: string;
}

export interface ProductVariation {
  variation_id: number;
  label: string;
  size?: string;
  color?: string;
  colorHex?: string;
  price: number;
  regular_price?: number;
  sku: string;
  in_stock: boolean;
}

export interface Product {
  id: number;
  slug: string;
  name: string;
  brand: string;
  categoryIds: number[];
  categories: { id: number; name: string; slug: string }[];
  categorySlug: MacroCategorySlug;
  categoryLabel: string;
  subcategories: string[];
  price: number;
  regular_price?: number;
  rating: number;
  reviews_count: number;
  sales_count: number;
  is_new?: boolean;
  is_bestseller?: boolean;
  short_description: string;
  description: string;
  specs: { label: string; value: string }[];
  images: string[];
  variations: ProductVariation[];
  default_variation_id: number;
  hasVariations?: boolean;
}

export interface CartItem {
  cartKey: string;
  wooCartKey?: string;
  product: Product;
  variation: ProductVariation;
  quantity: number;
}

export interface MegaCategoryLink {
  label: string;
  filterTerm: string;
  categoryId?: number;
  categorySlug?: string;
}

export interface MegaCategoryColumn {
  heading: string;
  links: MegaCategoryLink[];
}

export interface MegaSubcategoryNode {
  id: number;
  name: string;
  slug: string;
  count: number;
  children?: MegaSubcategoryNode[];
}

export interface MegaCategory {
  id?: number;
  slug: MacroCategorySlug;
  name: string;
  tagline: string;
  count?: number;
  image?: string;
  iconName:
    | 'Dog'
    | 'Cat'
    | 'Luggage'
    | 'Sparkles'
    | 'Cpu'
    | 'Rabbit'
    | 'Star'
    | 'Tag';
  columns: MegaCategoryColumn[];
  subcategories?: MegaSubcategoryNode[];
  featuredProductId?: number;
}

export interface ReviewItem {
  id: string;
  author: string;
  city: string;
  petName: string;
  petType: string;
  rating: number;
  title: string;
  comment: string;
  productPurchased: string;
  date: string;
}
