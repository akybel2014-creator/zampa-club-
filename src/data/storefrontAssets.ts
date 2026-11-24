import { ReviewItem } from '../types/shop';

export const HERO_ASSETS = {
  mainBanner: '/src/assets/images/hero_zampa_club.webp',
  promoDogs: '/src/assets/images/promo_speciale_cani.webp',
  promoCats: '/src/assets/images/promo_speciale_gatti.webp',
};

export const VERIFIED_REVIEWS: ReviewItem[] = [
  {
    id: 'rev-1',
    author: 'Claire Bennett',
    city: 'Austin, TX',
    petName: 'Cooper',
    petType: 'Golden Retriever, 4 yrs',
    rating: 5,
    title: 'Cooper’s favorite calming bed — super soft and durable',
    comment:
      'He settles right into the raised bolster every single night. After multiple washes the plush fabric still looks brand new and holds zero odor.',
    productPurchased: 'Calming Donut Pet Bed',
    date: 'October 14, 2026',
  },
  {
    id: 'rev-2',
    author: 'Marcus Reed',
    city: 'Seattle, WA',
    petName: 'Mochi',
    petType: 'British Shorthair, 2 yrs',
    rating: 5,
    title: 'Truly quiet fountain and super easy to clean',
    comment:
      'Mochi barely touched her old bowl. With the circulating water fountain she drinks constantly now, and we cannot hear the pump at all from two feet away.',
    productPurchased: 'Quiet Circulating Pet Water Fountain',
    date: 'November 2, 2026',
  },
  {
    id: 'rev-3',
    author: 'Hannah Brooks',
    city: 'Denver, CO',
    petName: 'Louie',
    petType: 'French Bulldog, 3 yrs',
    rating: 5,
    title: 'No chafing around the chest and easy adjustment',
    comment:
      'Finally a no-pull harness that stays off his neck and fits a Frenchie chest properly. The reflective stitching makes evening walks feel much safer.',
    productPurchased: 'No-Pull Reflective Dog Harness',
    date: 'November 18, 2026',
  },
];
