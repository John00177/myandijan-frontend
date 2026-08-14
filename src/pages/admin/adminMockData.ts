/**
 * Placeholder data for the admin areas whose endpoints genuinely do not exist.
 * Probed 2026-08-13: /admin/reviews, /admin/audit-logs and /admin/settings all
 * return 404 with and without auth. Swap these for real fetches once the backend
 * ships those routes.
 *
 * The activity feed has no candidate endpoint at all, so it is mock too.
 */

export type ActivityKind = "add" | "edit" | "delete" | "warning";

export interface AdminActivity {
  id: number;
  kind: ActivityKind;
  text: string;
  timeAgo: string;
}

export const ADMIN_ACTIVITY: AdminActivity[] = [
  { id: 1, kind: "add", text: "Yangi biznes qo'shildi: 'Ali Cafe'", timeAgo: "10 daqiqa oldin" },
  { id: 2, kind: "add", text: "Foydalanuvchi ro'yxatdan o'tdi: +99890...", timeAgo: "25 daqiqa oldin" },
  { id: 3, kind: "edit", text: "Sharh tasdiqlandi", timeAgo: "1 soat oldin" },
  { id: 4, kind: "delete", text: "Biznes o'chirildi", timeAgo: "2 soat oldin" },
  { id: 5, kind: "warning", text: "Spam sharh aniqlandi", timeAgo: "3 soat oldin" },
];

export interface AdminAuditLog {
  id: number;
  at: string;
  actor: string;
  action: string;
  details: string;
  kind: ActivityKind;
}

export const ADMIN_AUDIT_LOGS: AdminAuditLog[] = [
  { id: 1, at: "2026-08-12 14:30", actor: "admin@myandijan.uz", action: "Biznes tasdiqladi", details: "Ali Cafe", kind: "add" },
  { id: 2, at: "2026-08-12 13:15", actor: "moderator", action: "Sharh o'chirdi", details: "Spam", kind: "delete" },
  { id: 3, at: "2026-08-12 11:02", actor: "admin@myandijan.uz", action: "Turkum tahrirladi", details: "Oziq-ovqat", kind: "edit" },
  { id: 4, at: "2026-08-11 18:47", actor: "admin@myandijan.uz", action: "Foydalanuvchi blokladi", details: "+998901112233", kind: "warning" },
  { id: 5, at: "2026-08-11 16:20", actor: "moderator", action: "Biznes rad etdi", details: "Test Biznes", kind: "delete" },
  { id: 6, at: "2026-08-11 09:05", actor: "admin@myandijan.uz", action: "Tadbir tasdiqladi", details: "Yozgi chegirmalar", kind: "add" },
];

export interface AdminMockReview {
  id: number;
  authorName: string;
  businessName: string;
  rating: number;
  text: string;
  date: string;
  ownerReply: string | null;
}

export const ADMIN_MOCK_REVIEWS: AdminMockReview[] = [
  {
    id: 1,
    authorName: "Sardor Aliyev",
    businessName: "Osiyo Taomlari",
    rating: 5,
    text: "Juda yaxshi xizmat, tez va sifatli!",
    date: "2026-08-12",
    ownerReply: null,
  },
  {
    id: 2,
    authorName: "Malika Yusupova",
    businessName: "Osiyo Taomlari",
    rating: 4,
    text: "Yoqdi, lekin biroz kutishga to'g'ri keldi.",
    date: "2026-08-11",
    ownerReply: "Rahmat! Kutish vaqtini qisqartirish ustida ishlaymiz.",
  },
  {
    id: 3,
    authorName: "Jasur Karimov",
    businessName: "Andijon Tibbiyot Markazi",
    rating: 5,
    text: "Xodimlar juda mehribon.",
    date: "2026-08-10",
    ownerReply: null,
  },
  {
    id: 4,
    authorName: "Spam Bot",
    businessName: "Fargona Style",
    rating: 1,
    text: "http://spam-link.example — arzon narxlar!!!",
    date: "2026-08-09",
    ownerReply: null,
  },
];

export const ACTIVITY_DOT_CLASSES: Record<ActivityKind, string> = {
  add: "bg-success",
  edit: "bg-primary",
  delete: "bg-danger",
  warning: "bg-warning",
};

export const ACTIVITY_BADGE_TONES: Record<ActivityKind, "success" | "blue" | "danger" | "amber"> = {
  add: "success",
  edit: "blue",
  delete: "danger",
  warning: "amber",
};
