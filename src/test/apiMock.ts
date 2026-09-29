import { vi } from "vitest";
import type { Business, Category, PaginatedResponse, Region } from "../types";

// Central set of sensible empty defaults for every lib/api export a page
// component's hooks might call. Individual tests override just the calls
// they care about via mockResolvedValueOnce / mockResolvedValue.

export const mockBusiness: Business = {
  id: 1,
  slug: "soy-milliy-taomlar",
  nameUz: "Soy milliy taomlar",
  nameRu: "Сой миллий таомлар",
  nameEn: "Soy milliy taomlar",
  descriptionUz: "Milliy taomlar restorani",
  rating: 5,
  reviewCount: 1,
  phone: "+998901234567",
  address: "Andijon shahri",
  branches: [],
  reviews: [],
};

export const mockRegions: Region[] = [
  {
    id: 1,
    slug: "andijon",
    nameUz: "Andijon",
    nameRu: "Андижан",
    nameEn: "Andijan",
    isActive: true,
    sortOrder: 1,
    lat: null,
    lng: null,
    districts: [],
  },
];

export const mockCategories: Category[] = [
  {
    id: 1,
    parentId: null,
    slug: "food",
    nameUz: "Ovqatlanish",
    nameRu: "Еда и напитки",
    nameEn: "Food",
    descriptionUz: null,
    descriptionRu: null,
    descriptionEn: null,
    icon: null,
    colorHex: null,
    imageUrl: null,
    isActive: true,
    showOnHomepage: true,
    allowBusiness: true,
    sortOrder: 1,
    children: [],
  },
];

export const emptyPage: PaginatedResponse<Business> = {
  data: [],
  meta: { page: 1, limit: 20, total: 0, totalPages: 1 },
};

export const getRegions = vi.fn().mockResolvedValue(mockRegions);
export const getCategories = vi.fn().mockResolvedValue(mockCategories);
export const getCategoriesHomepage = vi.fn().mockResolvedValue(mockCategories);
export const getFeaturedBusinesses = vi.fn().mockResolvedValue([]);
export const searchBusinesses = vi.fn().mockResolvedValue(emptyPage);
export const getBusiness = vi.fn().mockResolvedValue(mockBusiness);
export const getMe = vi.fn().mockRejectedValue(new Error("not authenticated"));
export const getFavorites = vi.fn().mockResolvedValue([]);
export const getEvents = vi.fn().mockResolvedValue({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 1 } });
export const recordBusinessView = vi.fn();
export const recordBusinessClick = vi.fn();
export const recordSearch = vi.fn();
export const revokeSession = vi.fn().mockResolvedValue(undefined);

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export { ApiError };
export const SESSION_EXPIRED_EVENT = "myandijan:session-expired";
