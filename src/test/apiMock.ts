import { vi } from "vitest";
import type {
  AdminBusiness,
  AdminClaim,
  AdminReviewReport,
  AdminReview,
  Business,
  Category,
  District,
  EventDetail,
  MenuItem,
  MyClaim,
  PaginatedResponse,
  Region,
} from "../types";

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

export const mockDistrict: District = {
  id: 1,
  regionId: 1,
  slug: "andijon-tumani",
  nameUz: "Andijon",
  nameRu: "Андижан",
  nameEn: "Andijan",
  isActive: true,
  sortOrder: 1,
  lat: null,
  lng: null,
  cities: [],
};

export const getRegions = vi.fn().mockResolvedValue(mockRegions);
export const getCategories = vi.fn().mockResolvedValue(mockCategories);
export const getCategoriesHomepage = vi.fn().mockResolvedValue(mockCategories);
export const getCategoryBySlug = vi.fn().mockResolvedValue(mockCategories[0]);
export const getFeaturedBusinesses = vi.fn().mockResolvedValue([]);
export const searchBusinesses = vi.fn().mockResolvedValue(emptyPage);
export const searchBusinessesFts = vi.fn().mockResolvedValue(emptyPage);
export const getBusiness = vi.fn().mockResolvedValue(mockBusiness);
export const getMe = vi.fn().mockRejectedValue(new Error("not authenticated"));
export const getFavorites = vi.fn().mockResolvedValue([]);
export const getEvents = vi.fn().mockResolvedValue({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 1 } });

export const mockEvent: EventDetail = {
  id: 1,
  slug: "milliy-taomlar-festivali",
  title: "Milliy taomlar festivali",
  type: "FESTIVAL",
  coverUrl: null,
  startAt: "2026-10-01T10:00:00.000Z",
  endAt: "2026-10-01T18:00:00.000Z",
  venueName: "Andijon markaziy bozori",
  address: null,
  isFree: true,
  price: null,
  currency: null,
  attendeeCount: 3,
  business: { id: 1, slug: "soy-milliy-taomlar", name: "Soy milliy taomlar", logoUrl: null },
  district: null,
  description: "Andijon viloyatidagi eng mazali milliy taomlar bir joyda.",
  allowRsvp: true,
  maxAttendees: null,
  registrationUrl: null,
  category: null,
};

export const getEventBySlug = vi.fn().mockResolvedValue(mockEvent);
export const attendEvent = vi.fn().mockResolvedValue({});

export const mockAdminReview: AdminReview = {
  id: 1,
  rating: 5,
  title: null,
  comment: "Juda yaxshi xizmat!",
  status: "PUBLISHED",
  reportCount: 0,
  createdAt: "2026-09-20T10:00:00.000Z",
  user: { id: 2, fullName: "Sardor Aliyev", avatarUrl: null },
  branch: { id: 1, name: "Soy milliy taomlar", business: { id: 1, slug: "soy-milliy-taomlar", name: "Soy milliy taomlar" } },
  reply: null,
};

export const getAdminReviews = vi.fn().mockResolvedValue({ items: [mockAdminReview], total: 1 });
export const hideAdminReview = vi.fn().mockResolvedValue({ ...mockAdminReview, status: "HIDDEN" });
export const restoreAdminReview = vi.fn().mockResolvedValue({ ...mockAdminReview, status: "PUBLISHED" });

export const mockAdminClaim: AdminClaim = {
  id: 1,
  status: "PENDING",
  evidence: "Men ushbu biznesning egasiman",
  contactPhone: "+998901234567",
  contactNote: null,
  rejectionReason: null,
  createdAt: "2026-09-20T10:00:00.000Z",
  reviewedAt: null,
  business: { id: 1, slug: "soy-milliy-taomlar", name: "Soy milliy taomlar", ownerId: null },
  claimant: { id: 7, fullName: "Sardor Aliyev", phone: "+998901234567", email: null, role: "CUSTOMER" },
  reviewedBy: null,
};

export const mockMyClaim: MyClaim = {
  id: 1,
  status: "PENDING",
  rejectionReason: null,
  createdAt: "2026-09-20T10:00:00.000Z",
  reviewedAt: null,
  business: { id: 1, slug: "soy-milliy-taomlar", name: "Soy milliy taomlar" },
  reviewedBy: null,
};

export const mockMenuItem: MenuItem = {
  id: 1,
  businessId: 1,
  categoryId: 1,
  type: "PRODUCT",
  name: "Osh",
  description: "Milliy taom",
  imageUrl: null,
  price: "25000",
  currency: "UZS",
  unit: "PCS",
  isAvailable: true,
  isActive: true,
};

export const mockMyBusiness = {
  id: 1,
  slug: "soy-milliy-taomlar",
  name: "Soy milliy taomlar",
  status: "APPROVED" as const,
};

export const getBusinessMenu = vi.fn().mockResolvedValue([]);
export const getMyBusinessMenu = vi.fn().mockResolvedValue([]);
export const getMyBusinesses = vi.fn().mockResolvedValue([mockMyBusiness]);
export const createMenuItem = vi.fn().mockResolvedValue(mockMenuItem);
export const updateMenuItem = vi.fn().mockResolvedValue(mockMenuItem);
export const deleteMenuItem = vi.fn().mockResolvedValue(undefined);
export const uploadImage = vi.fn().mockResolvedValue({ url: "https://example.test/photo.jpg" });

export const mockAdminBusiness: AdminBusiness = {
  id: 5,
  slug: "soy-milliy-taomlar",
  name: "Soy milliy taomlar",
  status: "APPROVED",
  createdAt: "2026-09-20T10:00:00.000Z",
  isVerified: false,
  isPromoted: false,
  promotedUntil: null,
  rejectionReason: null,
  owner: { id: 7, fullName: "Sardor Aliyev", phone: "+998901234567" },
  category: { id: 1, nameUz: "Ovqatlanish", slug: "food" },
  branches: [{ id: 1, address: "Andijon shahri", phone: "+998901234567", district: { id: 1, nameUz: "Andijon" } }],
};

export const getAdminBusinesses = vi.fn().mockResolvedValue({ items: [mockAdminBusiness], total: 1 });
export const approveAdminBusiness = vi.fn().mockResolvedValue(mockAdminBusiness);
export const rejectAdminBusiness = vi.fn().mockResolvedValue(mockAdminBusiness);
export const verifyAdminBusiness = vi.fn().mockResolvedValue({ ...mockAdminBusiness, isVerified: true });
export const unverifyAdminBusiness = vi.fn().mockResolvedValue(mockAdminBusiness);
export const suspendAdminBusiness = vi.fn().mockResolvedValue({ ...mockAdminBusiness, status: "SUSPENDED" });
export const unsuspendAdminBusiness = vi.fn().mockResolvedValue(mockAdminBusiness);
export const promoteAdminBusiness = vi.fn().mockResolvedValue({ ...mockAdminBusiness, isPromoted: true });
export const unpromoteAdminBusiness = vi.fn().mockResolvedValue(mockAdminBusiness);
export const hideAdminBusiness = vi.fn().mockResolvedValue({ ...mockAdminBusiness, status: "HIDDEN" });
export const unhideAdminBusiness = vi.fn().mockResolvedValue(mockAdminBusiness);
export const updateAdminBusinessBranch = vi.fn().mockResolvedValue({});
export const updateAdminBusiness = vi.fn().mockResolvedValue(mockAdminBusiness);
export const updateAdminBusinessHours = vi.fn().mockResolvedValue([]);
export const updateBusiness = vi.fn().mockResolvedValue(mockAdminBusiness);
// EditBusinessModal pre-fills from this; a minimal edit detail is enough.
export const getBusinessById = vi.fn().mockResolvedValue({
  id: mockAdminBusiness.id,
  slug: mockAdminBusiness.slug,
  name: mockAdminBusiness.name,
  branches: [],
});
export const updateBusinessHours = vi.fn().mockResolvedValue([]);

export const mockAdminReport: AdminReviewReport = {
  id: 3,
  reason: "SPAM",
  note: "Reklama havolasi bor",
  status: "PENDING",
  createdAt: "2026-09-25T10:00:00.000Z",
  resolvedAt: null,
  resolutionNote: null,
  reporter: { id: 8, fullName: "Dilnoza Karimova" },
  review: {
    id: 11,
    rating: 1,
    comment: "Eng zo'r narxlar bizning saytda!",
    status: "PUBLISHED",
    reportCount: 2,
    user: { id: 9, fullName: "Spam Bot" },
    branch: { id: 1, name: "Soy milliy taomlar", business: { id: 1, slug: "soy-milliy-taomlar", name: "Soy milliy taomlar" } },
  },
};

export const reportReview = vi.fn().mockResolvedValue({ id: 1, reviewId: 11, reason: "SPAM", status: "PENDING" });
export const getAdminReports = vi.fn().mockResolvedValue({ items: [mockAdminReport], total: 1 });
export const resolveAdminReport = vi.fn().mockResolvedValue({ ...mockAdminReport, status: "RESOLVED" });
export const getAdminStats = vi.fn().mockResolvedValue({
  businessesByStatus: { APPROVED: 0, PENDING: 0 },
  pendingClaims: 0,
  pendingReviews: 0,
  pendingEvents: 0,
  openReports: 0,
  usersByRole: {},
  newSignups7d: 0,
});
export const getAdminAuditLogs = vi.fn().mockResolvedValue({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 1 } });
export const replyToReview = vi.fn().mockResolvedValue({});

export const createClaim = vi.fn().mockResolvedValue(mockMyClaim);
export const getMyClaims = vi
  .fn()
  .mockResolvedValue({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 1 } });
export const getAdminClaims = vi.fn().mockResolvedValue({ items: [mockAdminClaim], total: 1 });
export const approveAdminClaim = vi.fn().mockResolvedValue({ ...mockAdminClaim, status: "APPROVED" });
export const rejectAdminClaim = vi.fn().mockResolvedValue({ ...mockAdminClaim, status: "REJECTED" });
export const recordBusinessView = vi.fn();
export const recordBusinessClick = vi.fn();
export const recordSearch = vi.fn();
export const revokeSession = vi.fn().mockResolvedValue(undefined);
export const notifyLogout = vi.fn();

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export { ApiError };
export const SESSION_EXPIRED_EVENT = "myandijan:session-expired";
