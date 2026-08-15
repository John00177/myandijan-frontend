/**
 * Placeholder data for the admin areas whose endpoints genuinely do not exist.
 *
 * Re-checked 2026-08-15 against the actual backend source (not just probed
 * URLs): GET /admin/audit is real — an earlier session tried the wrong path
 * (/admin/audit-logs) and wrongly concluded it was missing. That view now
 * uses getAdminAuditLogs() from lib/api.ts instead of the mock data below.
 *
 * Genuinely absent: a review *list* endpoint (only POST /admin/reviews/:id/hide
 * and /restore exist, no GET) and /admin/settings. Those stay mock.
 */

export type ActivityKind = "add" | "edit" | "delete" | "warning";

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
