export type MacroCategorySlug =
  | 'cani'
  | 'gatti'
  | 'viaggio-trasporto'
  | 'cura-toelettatura'
  | 'smart-pet-tech'
  | 'piccoli-animali'
  | 'novita'
  | 'offerte';

export type QuickFilterTab =
  | 'tutti'
  | 'cani'
  | 'gatti'
  | 'smart-pet-tech'
  | 'offerte';

export type SortOption = 'popular' | 'price-asc' | 'price-desc' | 'rating';

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
}

export interface CartItem {
  cartKey: string;
  product: Product;
  variation: ProductVariation;
  quantity: number;
}

export interface MegaCategoryColumn {
  heading: string;
  links: { label: string; filterTerm: string }[];
}

export interface MegaCategory {
  slug: MacroCategorySlug;
  name: string;
  tagline: string;
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
  featuredProductId: number;
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
