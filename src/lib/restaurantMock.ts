import type { Business } from "../types";

export const CUISINE_SLUGS = ["milliy", "fast-food", "yapon", "italiyan", "koreys", "kafe"] as const;
export type CuisineSlug = (typeof CUISINE_SLUGS)[number];

const TAG_POOL: Record<CuisineSlug, string[]> = {
  milliy: ["Osh", "Shashlik", "Manti", "Lag'mon", "Somsa"],
  "fast-food": ["Burger", "Hot-dog", "Shaurma", "Fri kartoshka"],
  yapon: ["Sushi", "Ramen", "Rolls"],
  italiyan: ["Pizza", "Pasta", "Risotto"],
  koreys: ["Tteokbokki", "Kimchi", "Bulgogi"],
  kafe: ["Kofe", "Desert", "Choy"],
};

export const PRICE_BUCKETS = [
  { min: 0, max: 30, label: "30k gacha" },
  { min: 30, max: 60, label: "30-60k" },
  { min: 60, max: 100, label: "60-100k" },
  { min: 100, max: 150, label: "100k+" },
] as const;

function seed(n: number): number {
  const x = Math.sin(n * 999.777) * 10000;
  return x - Math.floor(x);
}

export interface RestaurantDisplayData {
  cuisine: CuisineSlug;
  rating: number;
  deliveryTime: string;
  priceBucket: number;
  priceLabel: string;
  tags: string[];
}

/**
 * The API doesn't return cuisine/price-range/delivery-time/rating for every
 * business yet, so Phase 1 fills gaps with values seeded from the business id
 * — the same business always renders the same mock data, and real fields
 * (rating, deliveryTime) win whenever the API does supply them.
 */
export function getRestaurantDisplayData(business: Business): RestaurantDisplayData {
  const s1 = seed(business.id);
  const s2 = seed(business.id + 1);
  const s3 = seed(business.id + 2);

  const cuisine = CUISINE_SLUGS[Math.floor(s1 * CUISINE_SLUGS.length)];
  const rating = business.rating ?? Number((3.8 + s2 * 1.1).toFixed(1));
  const deliveryTime =
    business.deliveryTime ??
    (() => {
      const start = 10 + Math.floor(s3 * 20);
      return `${start}-${start + 15} daq`;
    })();
  const priceBucket = Math.floor(s1 * PRICE_BUCKETS.length);
  const tags = TAG_POOL[cuisine].slice(0, 2 + Math.floor(s2 * 2));

  return { cuisine, rating, deliveryTime, priceBucket, priceLabel: PRICE_BUCKETS[priceBucket].label, tags };
}
