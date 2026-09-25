import type { Business, Lang } from "../types";

/**
 * Monetization data model.
 *
 * The API has no premium/subscription fields yet (no plan on the user, no
 * tier/priority on a business), so the values here are derived deterministically
 * from the business id — the same listing always shows the same tier, rank and
 * traffic curve, which is what makes the UI reviewable as a real design rather
 * than reshuffling on every render. Every read goes through
 * `getBusinessPremium`, so swapping in real API fields later is a change to one
 * function, not to every card.
 */

export type PlanId = "free" | "premium" | "featured";
export type PremiumTier = "none" | "bronze" | "silver" | "gold";
export type BillingCycle = "monthly" | "yearly";

/** Yearly billing bills 12 months at a 20% discount. */
export const YEARLY_DISCOUNT = 0.2;

export interface PlanDefinition {
  id: PlanId;
  /** so'm per month when billed monthly. */
  monthlyPrice: number;
  nameUz: string;
  nameRu: string;
  nameEn: string;
  taglineUz: string;
  taglineRu: string;
  taglineEn: string;
  featuresUz: string[];
  featuresRu: string[];
  featuresEn: string[];
  highlighted?: boolean;
}

export const PLANS: PlanDefinition[] = [
  {
    id: "free",
    monthlyPrice: 0,
    nameUz: "Bepul",
    nameRu: "Бесплатный",
    nameEn: "Free",
    taglineUz: "Boshlash uchun",
    taglineRu: "Для начала",
    taglineEn: "To get started",
    featuresUz: ["Biznes sahifasi", "Manzil va telefon", "Mijoz sharhlari", "Qidiruvda ko'rinish"],
    featuresRu: ["Страница бизнеса", "Адрес и телефон", "Отзывы клиентов", "Показ в поиске"],
    featuresEn: ["Business page", "Address and phone", "Customer reviews", "Appears in search"],
  },
  {
    id: "premium",
    monthlyPrice: 99_000,
    nameUz: "Premium",
    nameRu: "Премиум",
    nameEn: "Premium",
    taglineUz: "O'sayotgan bizneslar uchun",
    taglineRu: "Для растущего бизнеса",
    taglineEn: "For growing businesses",
    featuresUz: [
      "Bepul rejadagi hamma narsa",
      "Premium nishoni",
      "Qidiruvda yuqori o'rin",
      "10 tagacha rasm galereyasi",
      "Statistika: ko'rishlar va qo'ng'iroqlar",
      "Sharhlarga javob berish",
    ],
    featuresRu: [
      "Всё из бесплатного плана",
      "Значок Премиум",
      "Выше в результатах поиска",
      "Галерея до 10 фото",
      "Статистика: просмотры и звонки",
      "Ответы на отзывы",
    ],
    featuresEn: [
      "Everything in Free",
      "Premium badge",
      "Higher search ranking",
      "Gallery up to 10 photos",
      "Stats: views and calls",
      "Reply to reviews",
    ],
    highlighted: true,
  },
  {
    id: "featured",
    monthlyPrice: 249_000,
    nameUz: "Featured",
    nameRu: "Featured",
    nameEn: "Featured",
    taglineUz: "Maksimal ko'rinish",
    taglineRu: "Максимальная видимость",
    taglineEn: "Maximum visibility",
    featuresUz: [
      "Premium rejadagi hamma narsa",
      "Bosh sahifada Featured kartochka",
      "\"Tahrir tanlovi\" ro'yxatida",
      "Xaritada oltin belgi",
      "Cheksiz rasm galereyasi",
      "To'liq analitika va haftalik hisobot",
      "Ustuvor qo'llab-quvvatlash",
    ],
    featuresRu: [
      "Всё из Премиум",
      "Featured-карточка на главной",
      "В подборке «Выбор редакции»",
      "Золотая метка на карте",
      "Безлимитная галерея фото",
      "Полная аналитика и еженедельный отчёт",
      "Приоритетная поддержка",
    ],
    featuresEn: [
      "Everything in Premium",
      "Featured card on the homepage",
      "Included in Editor's Pick",
      "Gold pin on the map",
      "Unlimited photo gallery",
      "Full analytics and weekly report",
      "Priority support",
    ],
  },
];

export interface PaymentMethod {
  id: string;
  label: string;
  /** Brand tint used for the method chip. */
  colorHex: string;
}

export const PAYMENT_METHODS: PaymentMethod[] = [
  { id: "click", label: "Click", colorHex: "#00AEEF" },
  { id: "payme", label: "Payme", colorHex: "#33CCCC" },
  { id: "uzum", label: "Uzum", colorHex: "#7F4DFF" },
  { id: "cash", label: "Naqd", colorHex: "#2E7D32" },
];

export function planById(id: PlanId): PlanDefinition {
  return PLANS.find((plan) => plan.id === id) ?? PLANS[0];
}

export function planName(plan: PlanDefinition, lang: Lang): string {
  return lang === "ru" ? plan.nameRu : lang === "en" ? plan.nameEn : plan.nameUz;
}

export function planTagline(plan: PlanDefinition, lang: Lang): string {
  return lang === "ru" ? plan.taglineRu : lang === "en" ? plan.taglineEn : plan.taglineUz;
}

export function planFeatures(plan: PlanDefinition, lang: Lang): string[] {
  return lang === "ru" ? plan.featuresRu : lang === "en" ? plan.featuresEn : plan.featuresUz;
}

/** Price actually charged per month under the given cycle. */
export function monthlyPriceFor(plan: PlanDefinition, cycle: BillingCycle): number {
  if (cycle === "yearly") return Math.round((plan.monthlyPrice * (1 - YEARLY_DISCOUNT)) / 1000) * 1000;
  return plan.monthlyPrice;
}

/** Total charged up front for the given cycle (12x the monthly rate for yearly). */
export function totalPriceFor(plan: PlanDefinition, cycle: BillingCycle): number {
  return cycle === "yearly" ? monthlyPriceFor(plan, cycle) * 12 : plan.monthlyPrice;
}

/** 1 234 000 so'm — space-grouped, the standard UZ presentation. */
export function formatSum(amount: number): string {
  return `${amount.toLocaleString("ru-RU").replace(/ /g, " ")} so'm`;
}

export interface BusinessPremium {
  tier: PremiumTier;
  plan: PlanId;
  isFeatured: boolean;
  isSponsored: boolean;
  isTopRated: boolean;
  /** 1-based placement among paid listings; null when the listing is free. */
  priorityRank: number | null;
  /** Views per day for the last 7 days, oldest first. */
  weeklyViews: number[];
  totalViews: number;
  clicks: number;
  calls: number;
  directionRequests: number;
}

function seed(n: number): number {
  const x = Math.sin(n * 421.13) * 10000;
  return x - Math.floor(x);
}

const TIER_BY_PLAN: Record<PlanId, PremiumTier> = {
  free: "none",
  premium: "silver",
  featured: "gold",
};

export function getBusinessPremium(business: Business): BusinessPremium {
  const s1 = seed(business.id);
  const s2 = seed(business.id + 7);
  const s3 = seed(business.id + 13);

  // Roughly a third of listings paid — enough that premium treatments are
  // visible in a small dataset without every card looking sponsored.
  const plan: PlanId = s1 > 0.78 ? "featured" : s1 > 0.55 ? "premium" : "free";
  const tier: PremiumTier = plan === "premium" && s2 > 0.6 ? "bronze" : TIER_BY_PLAN[plan];

  const base = 40 + Math.floor(s2 * 160);
  const weeklyViews = Array.from({ length: 7 }, (_, day) => {
    const wobble = seed(business.id * 31 + day);
    // Weekends run hotter for hospitality, which is most of the directory.
    const weekendLift = day >= 5 ? 1.35 : 1;
    return Math.max(5, Math.round(base * weekendLift * (0.6 + wobble * 0.8)));
  });

  const totalViews = weeklyViews.reduce((sum, value) => sum + value, 0);

  return {
    tier,
    plan,
    isFeatured: plan === "featured",
    isSponsored: plan === "featured" && s3 > 0.45,
    isTopRated: (business.rating ?? 0) >= 4.7 || s3 > 0.85,
    priorityRank: plan === "free" ? null : 1 + Math.floor(s3 * 8),
    weeklyViews,
    totalViews,
    clicks: Math.round(totalViews * (0.18 + s2 * 0.12)),
    calls: Math.round(totalViews * (0.05 + s3 * 0.05)),
    directionRequests: Math.round(totalViews * (0.03 + s1 * 0.04)),
  };
}

/** Paid listings first, then by rank — the ordering search results apply. */
export function comparePremiumPriority(a: BusinessPremium, b: BusinessPremium): number {
  const weight = (p: BusinessPremium) => (p.plan === "featured" ? 2 : p.plan === "premium" ? 1 : 0);
  const byWeight = weight(b) - weight(a);
  if (byWeight !== 0) return byWeight;
  return (a.priorityRank ?? 99) - (b.priorityRank ?? 99);
}
