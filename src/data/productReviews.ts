export interface ProductReviewRecord {
  id: number;
  reviewer: string;
  title?: string;
  rating: number;
  review: string;
  dateCreated: string;
  verified?: boolean;
}

/**
 * Curated product reviews keyed by WooCommerce product ID.
 * Note: For product #498 (3-Compartment Galvanized Steel Chicken Nesting Box for Egg Laying),
 * all 2-star reviews from the provided batch were intentionally excluded per store owner instruction.
 */
export const CURATED_PRODUCT_REVIEWS_BY_ID: Record<number, ProductReviewRecord[]> = {
  498: [
    {
      id: 49801,
      reviewer: 'April',
      title: 'Roll-away design keeps eggs clean and intact',
      rating: 5,
      review:
        'Arrived quickly, felt solid, and was simple to assemble. Within a couple of days my hens adapted to laying inside, and the roll-out tray keeps eggs spotless and protected from pecking. Keeping the floor free of straw helps eggs roll smoothly, and mounting the box below roosting bars stops hens from sleeping on top. Putting metallic tape along the underside of the collection lid also prevents determined hens from pecking from underneath.',
      dateCreated: '2022-08-11T12:00:00Z',
      verified: true,
    },
    {
      id: 49802,
      reviewer: 'Patricia',
      title: 'Quick 20-minute build and durable metal',
      rating: 5,
      review:
        'The illustrated assembly diagrams were easy to follow and I finished putting this three-compartment box together in roughly twenty minutes. Sturdy sheet metal means no rotting wood to worry about—just put on work gloves while assembling since some edges are sharp.',
      dateCreated: '2022-03-08T12:00:00Z',
      verified: true,
    },
    {
      id: 49803,
      reviewer: 'DoubleR',
      title: 'Solved our cracked and pecked egg problem',
      rating: 5,
      review:
        'Switched from flat wooden boxes after losing too many eggs to pecking and breakage. Delivery was quick and wall mounting was straightforward (I opted for pop rivets instead of screws). Once we closed off the old nesting spots, all seven hens started using this box consistently with clean eggs daily.',
      dateCreated: '2022-06-16T12:00:00Z',
      verified: true,
    },
    {
      id: 49804,
      reviewer: 'Jen',
      title: 'Easy to clean and disinfect',
      rating: 5,
      review:
        'I wanted a nesting box that is much simpler to sanitize than timber coops, and this metal frame with plastic floor trays cleans up effortlessly. The plastic bottom stays warmer in winter too. A second pair of hands helps when fastening screws in tight corners, and several hens are already laying in it.',
      dateCreated: '2021-02-14T12:00:00Z',
      verified: true,
    },
    {
      id: 49805,
      reviewer: 'EddaOkie',
      title: 'Smart design and quick delivery',
      rating: 5,
      review:
        'Arrived well packaged and fast. Clever roll-away design and straightforward setup inside our coop.',
      dateCreated: '2020-10-12T12:00:00Z',
      verified: true,
    },
    {
      id: 49806,
      reviewer: 'Smallbean',
      title: 'Lightweight and works as expected',
      rating: 4,
      review:
        'Once fastened properly, the roll-out trays stay firmly in place and the whole unit is light and easy to hose down. Unlabeled panels and minimal instructions took about 15 minutes to figure out with a couple of tight screw holes, but the design works well.',
      dateCreated: '2021-08-26T12:00:00Z',
      verified: true,
    },
    {
      id: 49807,
      reviewer: 'KelM',
      title: 'Keeps hens from laying on the coop floor',
      rating: 4,
      review:
        'Glad the eggs roll into a separate collection bay away from the flock. Our hens needed a small bit of hay at first to coax them inside, and some eggs take a gentle slope check, yet it completely stopped floor laying.',
      dateCreated: '2021-11-29T12:00:00Z',
      verified: true,
    },
    {
      id: 49808,
      reviewer: 'Curtis',
      title: 'Works great once assembled',
      rating: 4,
      review:
        'The finished nesting box works nicely for our flock—just take care and wear gloves during assembly because a few sheet-metal edges are quite sharp.',
      dateCreated: '2021-11-12T12:00:00Z',
      verified: true,
    },
    {
      id: 49809,
      reviewer: 'Sammy',
      title: 'Simple setup with minor cosmetic scuffs',
      rating: 3,
      review:
        'Good value and easy to assemble, though a couple of painted panels arrived with minor surface scratches.',
      dateCreated: '2022-07-24T12:00:00Z',
      verified: true,
    },
    {
      id: 49810,
      reviewer: 'Dallas53',
      title: 'Great concept, tray catch needed small tweaks',
      rating: 3,
      review:
        'Our hens loved the nesting spaces right away, though assembly took patience. The rear lip holding the plastic tray felt a little shallow and droppings collected along the front tray, so I reinforced the back stop and added a narrow front slot so debris falls clear. With that quick tweak it holds securely.',
      dateCreated: '2021-03-17T12:00:00Z',
      verified: true,
    },
  ],
};

export function getCuratedReviewsForProduct(productId: number): ProductReviewRecord[] {
  return CURATED_PRODUCT_REVIEWS_BY_ID[productId] || [];
}

export function mergeProductReviews(
  productId: number,
  liveReviews: ProductReviewRecord[]
): ProductReviewRecord[] {
  const curated = getCuratedReviewsForProduct(productId);
  if (curated.length === 0) return liveReviews;
  if (!liveReviews || liveReviews.length === 0) return [...curated];

  const seenKeys = new Set(
    liveReviews.map((r) =>
      `${r.reviewer.trim().toLowerCase()}::${r.review.trim().slice(0, 32).toLowerCase()}`
    )
  );

  const uniqueCurated = curated.filter((c) => {
    const key = `${c.reviewer.trim().toLowerCase()}::${c.review.trim().slice(0, 32).toLowerCase()}`;
    return !seenKeys.has(key);
  });

  return [...liveReviews, ...uniqueCurated];
}

export function getReviewSummaryStats(
  productId: number,
  liveRating: number,
  liveCount: number
): { rating: number; reviewsCount: number } {
  const curated = getCuratedReviewsForProduct(productId);
  if (curated.length === 0) {
    return {
      rating: liveRating > 0 ? liveRating : 4.8,
      reviewsCount: liveCount,
    };
  }

  const curatedSum = curated.reduce((sum, item) => sum + item.rating, 0);
  const safeLiveCount = Math.max(0, liveCount);
  const totalCount = safeLiveCount + curated.length;
  const liveSum = safeLiveCount > 0 && liveRating > 0 ? liveRating * safeLiveCount : 0;
  const avg = Number(((liveSum + curatedSum) / totalCount).toFixed(1));

  return {
    rating: avg,
    reviewsCount: totalCount,
  };
}
