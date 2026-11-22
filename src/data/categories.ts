import { MegaCategory, WooCategory } from '../types/shop';

export const STATIC_WOO_CATEGORIES: WooCategory[] = [
  { id: 1, name: 'Dogs', slug: 'dogs', parent: 0, count: 4 },
  { id: 2, name: 'Cats', slug: 'cats', parent: 0, count: 4 },
  { id: 3, name: 'Travel & Carriers', slug: 'travel-carriers', parent: 0, count: 2 },
  { id: 4, name: 'Grooming & Care', slug: 'grooming-care', parent: 0, count: 2 },
  { id: 5, name: 'Smart Pet Tech', slug: 'smart-pet-tech', parent: 0, count: 3 },
  { id: 6, name: 'Small Pets', slug: 'small-pets', parent: 0, count: 1 },
];

export const MEGA_CATEGORIES: MegaCategory[] = [
  {
    id: 1,
    slug: 'dogs',
    name: 'Dogs',
    tagline: 'Orthopedic rest, safe walks, and everyday play',
    iconName: 'Dog',
    featuredProductId: 101,
    columns: [
      {
        heading: 'Rest & Home',
        links: [
          { label: 'Orthopedic Beds', filterTerm: 'Orthopedic Beds' },
          { label: 'Sofa Protectors', filterTerm: 'Orthopedic Beds' },
          { label: 'Cooling Mats', filterTerm: 'Orthopedic Beds' },
        ],
      },
      {
        heading: 'Walk & Gear',
        links: [
          { label: 'Harnesses & Leashes', filterTerm: 'Harnesses & Leashes' },
          { label: 'Apparel & Coats', filterTerm: 'Apparel & Coats' },
          { label: 'Reflective Collars', filterTerm: 'Harnesses & Leashes' },
        ],
      },
      {
        heading: 'Play & Mealtime',
        links: [
          { label: 'Interactive Toys', filterTerm: 'Interactive Toys' },
          { label: 'Bowls & Feeders', filterTerm: 'Bowls & Feeders' },
          { label: 'Enrichment & Chews', filterTerm: 'Interactive Toys' },
        ],
      },
    ],
  },
  {
    id: 2,
    slug: 'cats',
    name: 'Cats',
    tagline: 'Vertical lounging, quiet hydration, and feline enrichment',
    iconName: 'Cat',
    featuredProductId: 103,
    columns: [
      {
        heading: 'Climb & Lounge',
        links: [
          { label: 'Cat Trees & Scratchers', filterTerm: 'Cat Trees & Scratchers' },
          { label: 'Plush Loungers', filterTerm: 'Plush Loungers' },
          { label: 'Window Perches', filterTerm: 'Plush Loungers' },
        ],
      },
      {
        heading: 'Litter & Hydration',
        links: [
          { label: 'Litter Boxes & Scoops', filterTerm: 'Litter Boxes & Scoops' },
          { label: 'Water Fountains', filterTerm: 'Water Fountains' },
          { label: 'Litter Mats', filterTerm: 'Litter Boxes & Scoops' },
        ],
      },
      {
        heading: 'Hunt & Play',
        links: [
          { label: 'Toys & Tunnels', filterTerm: 'Toys & Tunnels' },
          { label: 'Feather Wands', filterTerm: 'Toys & Tunnels' },
          { label: 'Organic Catnip', filterTerm: 'Toys & Tunnels' },
        ],
      },
    ],
  },
  {
    id: 3,
    slug: 'travel-carriers',
    name: 'Travel & Carriers',
    tagline: 'Comfortable journeys by car, trail, or cabin',
    iconName: 'Luggage',
    featuredProductId: 106,
    columns: [
      {
        heading: 'Ergonomic Carry',
        links: [
          { label: 'Carrier Backpacks', filterTerm: 'Carrier Backpacks' },
          { label: 'Travel Totes', filterTerm: 'Travel Totes' },
          { label: 'Airline Carriers', filterTerm: 'Carrier Backpacks' },
        ],
      },
      {
        heading: 'Car Protection',
        links: [
          { label: 'Car Seat Covers', filterTerm: 'Car Seat Covers' },
          { label: 'Safety Seatbelts', filterTerm: 'Car Seat Covers' },
          { label: 'Folding Ramps', filterTerm: 'Car Seat Covers' },
        ],
      },
      {
        heading: 'On-the-Go Hydration',
        links: [
          { label: 'Portable Bottles', filterTerm: 'Portable Bottles' },
          { label: 'Collapsible Bowls', filterTerm: 'Portable Bottles' },
          { label: 'Weekend Travel Kits', filterTerm: 'Carrier Backpacks' },
        ],
      },
    ],
  },
  {
    id: 4,
    slug: 'grooming-care',
    name: 'Grooming & Care',
    tagline: 'Healthy coats, calm nail trims, and stress-free routines',
    iconName: 'Sparkles',
    featuredProductId: 107,
    columns: [
      {
        heading: 'Brushes & Coat',
        links: [
          { label: 'Self-Cleaning Brushes', filterTerm: 'Self-Cleaning Brushes' },
          { label: 'Deshedding Tools', filterTerm: 'Self-Cleaning Brushes' },
          { label: 'Massage Gloves', filterTerm: 'Self-Cleaning Brushes' },
        ],
      },
      {
        heading: 'Nails & Paws',
        links: [
          { label: 'LED Nail Clippers', filterTerm: 'LED Nail Clippers' },
          { label: 'Quiet Nail Grinders', filterTerm: 'LED Nail Clippers' },
          { label: 'Paw Balm & Care', filterTerm: 'Bath & Hygiene' },
        ],
      },
      {
        heading: 'Bath & Drying',
        links: [
          { label: 'Microfiber Towels', filterTerm: 'Microfiber Towels' },
          { label: 'Bath & Hygiene', filterTerm: 'Bath & Hygiene' },
          { label: 'Gentle Sprayers', filterTerm: 'Bath & Hygiene' },
        ],
      },
    ],
  },
  {
    id: 5,
    slug: 'smart-pet-tech',
    name: 'Smart Pet Tech',
    tagline: 'Scheduled meals, HD check-ins, and autonomous play',
    iconName: 'Cpu',
    featuredProductId: 105,
    columns: [
      {
        heading: 'Smart Feeding',
        links: [
          { label: 'Wi-Fi Auto Feeders', filterTerm: 'Wi-Fi Auto Feeders' },
          { label: 'Portion Control Bowls', filterTerm: 'Wi-Fi Auto Feeders' },
          { label: 'Smart Water Fountains', filterTerm: 'Water Fountains' },
        ],
      },
      {
        heading: 'Home Monitoring',
        links: [
          { label: 'Pet Cameras', filterTerm: 'Pet Cameras' },
          { label: 'GPS Trackers', filterTerm: 'GPS Trackers' },
          { label: 'Smart Pet Doors', filterTerm: 'Pet Cameras' },
        ],
      },
      {
        heading: 'Motion & Play',
        links: [
          { label: 'Auto Laser Toys', filterTerm: 'Auto Laser Toys' },
          { label: 'Smart Motion Balls', filterTerm: 'Interactive Toys' },
          { label: 'Auto Ball Launchers', filterTerm: 'Auto Laser Toys' },
        ],
      },
    ],
  },
  {
    id: 6,
    slug: 'small-pets',
    name: 'Small Pets',
    tagline: 'Natural fibers and safe habitats for rabbits, guinea pigs & birds',
    iconName: 'Rabbit',
    featuredProductId: 113,
    columns: [
      {
        heading: 'Rabbits & Small Mammals',
        links: [
          { label: 'Rabbits & Small Pets', filterTerm: 'Rabbits & Small Pets' },
          { label: 'Woven Seagrass Tunnels', filterTerm: 'Rabbits & Small Pets' },
          { label: 'Applewood Chew Toys', filterTerm: 'Rabbits & Small Pets' },
        ],
      },
      {
        heading: 'Birds',
        links: [
          { label: 'Bird Essentials', filterTerm: 'Bird Essentials' },
          { label: 'Natural Perches & Swings', filterTerm: 'Bird Essentials' },
          { label: 'Cage Baths', filterTerm: 'Bird Essentials' },
        ],
      },
      {
        heading: 'Habitat & Bedding',
        links: [
          { label: 'Cage Accessories', filterTerm: 'Cage Accessories' },
          { label: 'No-Drip Waterers', filterTerm: 'Cage Accessories' },
          { label: 'Organic Hay & Bedding', filterTerm: 'Cage Accessories' },
        ],
      },
    ],
  },
  {
    slug: 'new-arrivals',
    name: 'New Arrivals',
    tagline: 'Fresh seasonal picks curated for US pet homes',
    iconName: 'Star',
    featuredProductId: 111,
    columns: [
      {
        heading: 'New Tech',
        links: [
          { label: '2K Treat-Tossing Pet Cam', filterTerm: 'Pet Cameras' },
          { label: 'Smart Motion Play Ball', filterTerm: 'Interactive Toys' },
          { label: '4L Wi-Fi Smart Feeder', filterTerm: 'Wi-Fi Auto Feeders' },
        ],
      },
      {
        heading: 'New Home & Living',
        links: [
          { label: 'Nordic Birch Cat Tower', filterTerm: 'Cat Trees & Scratchers' },
          { label: 'Ceramic Water Fountain', filterTerm: 'Water Fountains' },
          { label: 'Seagrass Bunny Tunnel', filterTerm: 'Rabbits & Small Pets' },
        ],
      },
      {
        heading: 'New Outdoor',
        links: [
          { label: 'Panoramic Mesh Backpack', filterTerm: 'Carrier Backpacks' },
          { label: 'Ergo Harness & Leash Set', filterTerm: 'Harnesses & Leashes' },
          { label: 'Waterproof Car Hammock', filterTerm: 'Car Seat Covers' },
        ],
      },
    ],
  },
  {
    slug: 'deals',
    name: 'Deals & Value Sets',
    tagline: 'Save up to 30% on curated bundles and everyday favorites',
    iconName: 'Tag',
    featuredProductId: 102,
    columns: [
      {
        heading: 'Active Deals',
        links: [
          { label: 'All Sale Items', filterTerm: 'ON_SALE' },
          { label: 'Discounted Best Sellers', filterTerm: 'ON_SALE' },
          { label: 'Under $30', filterTerm: 'ON_SALE' },
        ],
      },
      {
        heading: 'Bundles & Sets',
        links: [
          { label: 'Complete Walk Set', filterTerm: 'Harnesses & Leashes' },
          { label: 'At-Home Grooming Kit', filterTerm: 'Self-Cleaning Brushes' },
          { label: 'Cozy Sleep Bundle', filterTerm: 'Orthopedic Beds' },
        ],
      },
      {
        heading: 'Club Perks',
        links: [
          { label: 'Free Shipping Over $39', filterTerm: 'ON_SALE' },
          { label: '10% Off First Order', filterTerm: 'ON_SALE' },
          { label: '30-Day Easy Returns', filterTerm: 'ON_SALE' },
        ],
      },
    ],
  },
];
