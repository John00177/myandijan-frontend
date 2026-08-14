/**
 * Analytics placeholder data.
 *
 * There is no analytics/timeseries endpoint on the API — /admin/stats returns
 * scalar counts at most, and nothing exposes per-day views, growth history or
 * per-district totals. So every series here is mock.
 *
 * Category and district names ARE the real ones (observed from /categories and
 * /geography/regions), so labels, ordering and label-length behaviour match what
 * real data will look like — only the numbers are invented.
 */

export interface SparkPoint {
  i: number;
  v: number;
}

function spark(values: number[]): SparkPoint[] {
  return values.map((v, i) => ({ i, v }));
}

export const SPARK_BUSINESSES = spark([12, 14, 13, 18, 21, 24, 27]);
export const SPARK_ACTIVE_USERS = spark([180, 210, 195, 240, 265, 250, 290]);
export const SPARK_DAILY_VIEWS = spark([1200, 1450, 1380, 1720, 1900, 2100, 2340]);
export const SPARK_NEW_REVIEWS = spark([4, 6, 5, 9, 7, 11, 13]);

export interface ViewsPoint {
  day: string;
  views: number;
}

/**
 * 30 days with a deliberate mid-month dip so the curve reads as plausible
 * traffic rather than a straight line.
 */
export const VIEWS_30_DAYS: ViewsPoint[] = [
  980, 1040, 1120, 1080, 1210, 1340, 1290, 1410, 1520, 1480, 1600, 1720, 1650, 1540, 1490, 1580, 1710, 1830, 1920,
  1870, 2010, 2140, 2080, 2230, 2310, 2280, 2420, 2510, 2470, 2620,
].map((views, i) => ({ day: String(i + 1).padStart(2, "0"), views }));

export interface CategorySlice {
  name: string;
  value: number;
}

/** Real category names from /categories. */
export const CATEGORY_DISTRIBUTION: CategorySlice[] = [
  { name: "Oziq-ovqat", value: 128 },
  { name: "Sotuv", value: 96 },
  { name: "Xizmatlar", value: 74 },
  { name: "Sog'liq", value: 61 },
  { name: "Go'zallik", value: 48 },
  { name: "Ta'lim", value: 37 },
  { name: "Avto", value: 29 },
  { name: "Ko'chmas mulk", value: 18 },
];

export interface DistrictBar {
  district: string;
  count: number;
}

/** Real district names from /geography/regions, pre-sorted descending. */
export const BUSINESSES_BY_DISTRICT: DistrictBar[] = [
  { district: "Andijon tumani", count: 142 },
  { district: "Asaka", count: 98 },
  { district: "Shahrixon", count: 81 },
  { district: "Marhamat", count: 67 },
  { district: "Qurghontepa", count: 59 },
  { district: "Xo'jaobod", count: 52 },
  { district: "Paxtabad", count: 44 },
  { district: "Izboskan", count: 38 },
  { district: "Baliqchi", count: 33 },
  { district: "Jalaquduq", count: 29 },
  { district: "Oltinko'l", count: 24 },
  { district: "Buloqboshi", count: 19 },
  { district: "Bo'ston", count: 14 },
  { district: "Ulug'nor", count: 9 },
];

export interface UserGrowthPoint {
  month: string;
  registered: number;
  active: number;
}

export const USER_GROWTH_12M: UserGrowthPoint[] = [
  { month: "Yan", registered: 320, active: 180 },
  { month: "Fev", registered: 410, active: 240 },
  { month: "Mar", registered: 520, active: 310 },
  { month: "Apr", registered: 640, active: 380 },
  { month: "May", registered: 790, active: 470 },
  { month: "Iyn", registered: 910, active: 540 },
  { month: "Iyl", registered: 1080, active: 620 },
  { month: "Avg", registered: 1240, active: 710 },
  { month: "Sen", registered: 1390, active: 780 },
  { month: "Okt", registered: 1560, active: 870 },
  { month: "Noy", registered: 1720, active: 940 },
  { month: "Dek", registered: 1910, active: 1050 },
];

export const TOTAL_CATEGORIES = CATEGORY_DISTRIBUTION.length;
