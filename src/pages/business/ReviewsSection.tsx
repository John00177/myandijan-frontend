import { MessageSquare, Star, X } from "lucide-react";
import { useState } from "react";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import ReviewForm from "../../components/business/ReviewForm";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { ApiError, replyToReview } from "../../lib/api";
import { initials } from "../../lib/initials";
import type { Review } from "../../types";

interface ReviewsSectionProps {
  businessId: number;
  ownerId?: number | null;
  reviews: Review[] | undefined;
  /** Re-fetches the business (and its reviews) after a successful post/reply. */
  onChanged: () => void;
}

const AVATAR_PALETTE = ["#3B82F6", "#F97316", "#8B5CF6", "#06B6D4", "#EC4899"];

const DATE_LOCALE: Record<string, string> = { uz: "uz-UZ", ru: "ru-RU", en: "en-US" };

function formatDate(iso: string, lang: string): string {
  return new Date(iso).toLocaleDateString(DATE_LOCALE[lang] ?? "uz-UZ", { day: "numeric", month: "long", year: "numeric" });
}

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5 text-warning">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={size} className={i < rating ? "fill-warning" : "text-ink-muted"} />
      ))}
    </div>
  );
}

function PhotoLightbox({ url, onClose }: { url: string; onClose: () => void }) {
  const { t } = useLanguage();
  return (
    <div
      className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button onClick={onClose} aria-label={t("close")} className="absolute top-4 right-4 text-white/80 hover:text-white">
        <X size={24} />
      </button>
      <img src={url} alt="" className="max-w-full max-h-full rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
    </div>
  );
}

function ReplyBox({ reviewId, onDone }: { reviewId: number; onDone: () => void }) {
  const { t } = useLanguage();
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!body.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await replyToReview(reviewId, body.trim());
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.genericError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-3 pl-3 border-l-2 border-primary/30 flex flex-col gap-2">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={t("writeReplyPlaceholder")}
        rows={2}
        className="h-auto py-2 px-3 bg-elevated border border-white/[0.10] rounded-xl text-sm text-ink placeholder:text-ink-muted outline-none focus:border-primary/50 resize-none"
      />
      {error && <p className="text-xs text-danger">{error}</p>}
      <Button size="sm" variant="primary" className="self-start" disabled={submitting} onClick={submit}>
        {submitting ? `${t("sending")}...` : t("send")}
      </Button>
    </div>
  );
}

export default function ReviewsSection({ businessId, ownerId, reviews, onChanged }: ReviewsSectionProps) {
  const { user, token, openAuthModal } = useAuth();
  const { t, lang } = useLanguage();
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);

  const canManage = !!user && (user.id === ownerId || user.role === "ADMIN" || user.role === "SUPER_ADMIN" || user.role === "MODERATOR");

  return (
    <section id="reviews" className="mt-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-ink">{t("reviews")}</h2>
        {!showForm && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => (token ? setShowForm(true) : openAuthModal())}
          >
            {t("writeReview")}
          </Button>
        )}
      </div>

      {showForm && (
        <ReviewForm
          businessId={businessId}
          onDone={() => {
            setShowForm(false);
            onChanged();
          }}
        />
      )}

      {!reviews || reviews.length === 0 ? (
        <EmptyState icon={MessageSquare} title={t("noReviews")} body={t("noReviewsBody")} />
      ) : (
        <div className="flex flex-col gap-3">
          {reviews.map((review, i) => {
            const name = review.user?.fullName ?? t("anonymousUser");
            return (
              <Card key={review.id} className="p-4">
                <div className="flex items-center gap-3">
                  {review.user?.avatarUrl ? (
                    <img src={review.user.avatarUrl} alt="" className="size-9 rounded-full object-cover shrink-0" />
                  ) : (
                    <div
                      className="size-9 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0"
                      style={{ backgroundColor: AVATAR_PALETTE[i % AVATAR_PALETTE.length] }}
                    >
                      {initials(name)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-ink">{name}</div>
                    <div className="text-xs text-ink-muted">{formatDate(review.createdAt, lang)}</div>
                  </div>
                  <Stars rating={review.rating} />
                </div>

                {review.title && <p className="text-sm font-semibold text-ink mt-3">{review.title}</p>}
                <p className="text-sm text-ink-body mt-1.5">{review.comment}</p>

                {review.photos && review.photos.length > 0 && (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {review.photos.map((url) => (
                      <button
                        key={url}
                        type="button"
                        onClick={() => setLightboxUrl(url)}
                        className="size-16 rounded-lg overflow-hidden border border-white/[0.10]"
                      >
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}

                {review.reply ? (
                  <div className="mt-3 pl-3 border-l-2 border-primary/30">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-primary px-2 py-0.5 rounded-full bg-primary/10">
                        {t("businessOwnerBadge")}
                      </span>
                      <span className="text-xs text-ink-muted">{formatDate(review.reply.createdAt, lang)}</span>
                    </div>
                    <p className="text-sm text-ink-body mt-1.5">{review.reply.body}</p>
                  </div>
                ) : (
                  canManage &&
                  (replyingTo === review.id ? (
                    <ReplyBox
                      reviewId={review.id}
                      onDone={() => {
                        setReplyingTo(null);
                        onChanged();
                      }}
                    />
                  ) : (
                    <Button size="sm" variant="ghost" className="mt-3" onClick={() => setReplyingTo(review.id)}>
                      {t("reply")}
                    </Button>
                  ))
                )}
              </Card>
            );
          })}
        </div>
      )}

      {lightboxUrl && <PhotoLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
    </section>
  );
}
