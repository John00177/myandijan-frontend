import { MessageSquare, Star } from "lucide-react";
import { useMemo, useState } from "react";
import Button from "../../../components/ui/Button";
import EmptyState from "../../../components/ui/EmptyState";
import { initials } from "../../../lib/initials";
import { ADMIN_MOCK_REVIEWS, type AdminMockReview } from "../adminMockData";
import { formatDate } from "../statusLabels";

const inputClasses =
  "h-10 bg-elevated border border-white/[0.10] rounded-lg px-3 text-sm text-ink outline-none focus:border-primary/50";

export default function AdminReviewsView() {
  // /admin/reviews returns 404 — this list is mock. See adminMockData.ts.
  const [reviews, setReviews] = useState<AdminMockReview[]>(ADMIN_MOCK_REVIEWS);
  const [businessFilter, setBusinessFilter] = useState("");
  const [ratingFilter, setRatingFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const businesses = useMemo(() => Array.from(new Set(ADMIN_MOCK_REVIEWS.map((r) => r.businessName))), []);

  const rows = reviews.filter((r) => {
    if (businessFilter && r.businessName !== businessFilter) return false;
    if (ratingFilter && String(r.rating) !== ratingFilter) return false;
    if (statusFilter === "replied" && !r.ownerReply) return false;
    if (statusFilter === "unreplied" && r.ownerReply) return false;
    return true;
  });

  function handleDelete(id: number) {
    setReviews((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <select value={businessFilter} onChange={(e) => setBusinessFilter(e.target.value)} className={inputClasses}>
          <option value="">Barcha bizneslar</option>
          {businesses.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <select value={ratingFilter} onChange={(e) => setRatingFilter(e.target.value)} className={inputClasses}>
          <option value="">Barcha reytinglar</option>
          {[5, 4, 3, 2, 1].map((r) => (
            <option key={r} value={String(r)}>
              {r} yulduz
            </option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputClasses}>
          <option value="">Barchasi</option>
          <option value="unreplied">Javobsiz</option>
          <option value="replied">Javob berilgan</option>
        </select>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={MessageSquare} title="Sharhlar topilmadi" body="Filtrlarni o'zgartirib ko'ring." />
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((review) => (
            <div key={review.id} className="bg-card border border-white/[0.08] rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                  {initials(review.authorName)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-ink truncate">{review.authorName}</div>
                  <div className="text-xs text-ink-muted truncate">
                    {review.businessName} · {formatDate(review.date)}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-warning shrink-0">
                  <Star size={14} className="fill-warning" />
                  <span className="text-sm font-semibold">{review.rating}</span>
                </div>
              </div>

              <p className="text-sm text-ink-body mt-3">{review.text}</p>

              {review.ownerReply && (
                <div className="mt-3 pl-3 border-l-2 border-primary/30">
                  <div className="text-xs font-medium text-primary">Biznes javobi</div>
                  <p className="text-sm text-ink-body mt-1">{review.ownerReply}</p>
                </div>
              )}

              <div className="flex gap-2 mt-3">
                {!review.ownerReply && (
                  <Button variant="ghost" size="sm">
                    Javob berish
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="!text-danger hover:!bg-danger/10"
                  onClick={() => handleDelete(review.id)}
                >
                  O'chirish
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
