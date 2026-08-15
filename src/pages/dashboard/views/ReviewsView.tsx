import { MessageSquare, Star } from "lucide-react";
import { useCallback, useState } from "react";
import Button from "../../../components/ui/Button";
import EmptyState from "../../../components/ui/EmptyState";
import Skeleton from "../../../components/ui/Skeleton";
import { useAdminResource } from "../../../hooks/useAdminResource";
import { ApiError, getMyReviews, replyToMyReview } from "../../../lib/api";
import { initials } from "../../../lib/initials";
import type { MyReview } from "../../../types";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return "hozirgina";
  if (hours < 24) return `${hours} soat oldin`;
  const days = Math.floor(hours / 24);
  return `${days} kun oldin`;
}

function ReviewCard({ review, onReplied }: { review: MyReview; onReplied: (reviewId: number, body: string) => void }) {
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    if (!replyText.trim()) return;
    setSending(true);
    setError(null);
    try {
      await replyToMyReview(review.id, replyText.trim());
      onReplied(review.id, replyText.trim());
      setReplying(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Javob yuborilmadi");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="bg-card border border-white/[0.08] rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className="size-9 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold shrink-0">
          {initials(review.user?.fullName ?? "?")}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-ink">{review.user?.fullName ?? "Foydalanuvchi"}</div>
          <div className="text-xs text-ink-muted">
            {review.branch?.business?.name ?? review.branch?.name ?? "—"} · {timeAgo(review.createdAt)}
          </div>
        </div>
        <div className="flex items-center gap-1 text-warning shrink-0">
          <Star size={14} className="fill-warning" />
          <span className="text-sm font-semibold">{review.rating}</span>
        </div>
      </div>

      <p className="text-sm text-ink-body mt-3">{review.comment}</p>

      {review.reply ? (
        <div className="mt-3 pl-3 border-l-2 border-primary/30">
          <div className="text-xs font-medium text-primary">Sizning javob</div>
          <p className="text-sm text-ink-body mt-1">{review.reply.body}</p>
        </div>
      ) : replying ? (
        <div className="mt-3">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={2}
            placeholder="Javob yozing..."
            className="w-full bg-elevated border border-white/[0.10] rounded-xl px-3 py-2 text-sm text-ink placeholder:text-ink-muted outline-none focus:border-primary/50"
          />
          {error && <p className="text-xs text-danger mt-1">{error}</p>}
          <div className="flex gap-2 mt-2">
            <Button variant="primary" size="sm" onClick={handleSend} disabled={sending}>
              {sending ? "Yuborilmoqda..." : "Yuborish"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setReplying(false)} disabled={sending}>
              Bekor qilish
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="ghost" size="sm" className="mt-3" onClick={() => setReplying(true)}>
          Javob berish
        </Button>
      )}
    </div>
  );
}

export default function ReviewsView() {
  const fetcher = useCallback(() => getMyReviews({ limit: 50 }), []);
  const { data, state, status, reload } = useAdminResource(fetcher);
  const [localReplies, setLocalReplies] = useState<Record<number, string>>({});

  function handleReplied(reviewId: number, body: string) {
    setLocalReplies((prev) => ({ ...prev, [reviewId]: body }));
  }

  if (state === "loading") {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[140px]" />
        ))}
      </div>
    );
  }

  if (state === "forbidden" || state === "error") {
    return (
      <EmptyState
        icon={MessageSquare}
        title="Ma'lumotni yuklab bo'lmadi"
        body={status ? `So'rov bajarilmadi (${status}). Qayta urinib ko'ring.` : "So'rov bajarilmadi."}
        actionLabel="Qayta urinish"
        onAction={reload}
      />
    );
  }

  const reviews = data?.data ?? [];

  if (reviews.length === 0) {
    return (
      <EmptyState icon={MessageSquare} title="Hozircha sharhlar yo'q" body="Mijozlaringiz sharh qoldirganda shu yerda ko'rinadi." />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {reviews.map((review) => (
        <ReviewCard
          key={review.id}
          review={localReplies[review.id] ? { ...review, reply: { id: 0, body: localReplies[review.id], createdAt: new Date().toISOString() } } : review}
          onReplied={handleReplied}
        />
      ))}
    </div>
  );
}
