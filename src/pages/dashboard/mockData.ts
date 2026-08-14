/**
 * The API has no owner-scoped endpoints yet — GET /businesses/mine, an events
 * endpoint filtered to the current owner, and a reviews endpoint all 404 as of
 * this writing. Everything below is placeholder data so the dashboard has
 * something to render; swap for real fetches once those endpoints exist.
 */

export interface MockBusiness {
  id: number;
  name: string;
  category: string;
  status: "approved" | "pending";
  imageUrl: string | null;
}

export const MOCK_BUSINESSES: MockBusiness[] = [
  { id: 1, name: "Osiyo Taomlari", category: "Oziq-ovqat", status: "approved", imageUrl: null },
  { id: 2, name: "Andijon Tibbiyot Markazi", category: "Sog'liq", status: "approved", imageUrl: null },
  { id: 3, name: "Fargona Style", category: "Sotuv", status: "pending", imageUrl: null },
];

export interface MockActivity {
  id: number;
  text: string;
  timeAgo: string;
}

export const MOCK_ACTIVITY: MockActivity[] = [
  { id: 1, text: "Yangi sharh: 5 yulduz", timeAgo: "2 soat oldin" },
  { id: 2, text: "Yangi ko'rish: Andijon shahri", timeAgo: "3 soat oldin" },
  { id: 3, text: "Biznes tasdiqlandi", timeAgo: "1 kun oldin" },
  { id: 4, text: "Yangi qo'ng'iroq qabul qilindi", timeAgo: "2 kun oldin" },
];

export interface MockReview {
  id: number;
  authorName: string;
  rating: number;
  text: string;
  businessName: string;
  timeAgo: string;
  ownerReply: string | null;
}

export const MOCK_REVIEWS: MockReview[] = [
  {
    id: 1,
    authorName: "Sardor Aliyev",
    rating: 5,
    text: "Juda yaxshi xizmat, tez va sifatli!",
    businessName: "Osiyo Taomlari",
    timeAgo: "2 soat oldin",
    ownerReply: null,
  },
  {
    id: 2,
    authorName: "Malika Yusupova",
    rating: 4,
    text: "Yoqdi, lekin biroz kutishga to'g'ri keldi.",
    businessName: "Osiyo Taomlari",
    timeAgo: "1 kun oldin",
    ownerReply: "Rahmat! Kutish vaqtini qisqartirish ustida ishlaymiz.",
  },
  {
    id: 3,
    authorName: "Jasur Karimov",
    rating: 5,
    text: "Xodimlar juda mehribon, albatta qaytib kelaman.",
    businessName: "Andijon Tibbiyot Markazi",
    timeAgo: "3 kun oldin",
    ownerReply: null,
  },
];

export interface MockEvent {
  id: number;
  title: string;
  date: string;
  status: "upcoming" | "past";
}

export const MOCK_EVENTS: MockEvent[] = [
  { id: 1, title: "Yozgi chegirmalar kuni", date: "2026-08-20", status: "upcoming" },
  { id: 2, title: "Yangi filial ochilishi", date: "2026-07-15", status: "past" },
];

export const PRODUCT_CATEGORIES = ["Oziq-ovqat", "Go'zallik", "Elektronika", "Maishiy", "Kiyim"] as const;

export interface Product {
  id: number;
  name: string;
  sku: string;
  category: string;
  price: number;
  quantity: number;
  description: string;
  imageUrl: string | null;
}

export const LOW_STOCK_THRESHOLD = 5;

export const MOCK_PRODUCTS: Product[] = [
  { id: 1, name: "Non", sku: "1001", category: "Oziq-ovqat", price: 5000, quantity: 50, description: "", imageUrl: null },
  { id: 2, name: "Sut", sku: "1002", category: "Oziq-ovqat", price: 12000, quantity: 20, description: "", imageUrl: null },
  { id: 3, name: "Shampun", sku: "1003", category: "Go'zallik", price: 35000, quantity: 0, description: "", imageUrl: null },
  { id: 4, name: "Telefon", sku: "1004", category: "Elektronika", price: 2500000, quantity: 5, description: "", imageUrl: null },
  {
    id: 5,
    name: "Kir yuvish kukuni",
    sku: "1005",
    category: "Maishiy",
    price: 28000,
    quantity: 3,
    description: "",
    imageUrl: null,
  },
];
