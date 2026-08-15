/**
 * Products/inventory have no backend at all (no /me/products, no catalog
 * endpoint) — this stays mock, labeled "Demo" in InventoryView. Businesses,
 * activity, reviews and events used to be mock here too; they now come from
 * the real /me/businesses, /me/reviews and /me/events endpoints instead
 * (see MyBusinessesView, DashboardHomeView, ReviewsView, EventsView).
 */

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
