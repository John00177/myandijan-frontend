import { MessageSquare, Star } from "lucide-react";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import type { Review } from "../../types";

interface ReviewsSectionProps {
  reviews: Review[] | undefined;
}

const AVATAR_PALETTE = ["#3B82F6", "#F97316", "#8B5CF6", "#06B6D4", "#EC4899"];

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("uz-UZ", { day: "numeric", month: "long", year: "numeric" });
}

export default function ReviewsSection({ reviews }: ReviewsSectionProps) {
  return (
    <section id="reviews" className="mt-10">
      <h2 className="text-xl font-bold text-ink mb-4">Sharhlar</h2>

      {!reviews || reviews.length === 0 ? (
        <EmptyState icon={MessageSquare} title="Sharhlar yo'q" body="Birinchi bo'lib fikr bildiring." />
      ) : (
        <div className="flex flex-col gap-3">
          {reviews.map((review, i) => (
            <Card key={review.id} className="p-4">
              <div className="flex items-center gap-3">
                <div
                  className="size-9 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0"
                  style={{ backgroundColor: AVATAR_PALETTE[i % AVATAR_PALETTE.length] }}
                >
                  {initials(review.authorName)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-ink">{review.authorName}</div>
                  <div className="text-xs text-ink-muted">{formatDate(review.createdAt)}</div>
                </div>
                <div className="flex items-center gap-1 text-warning">
                  <Star size={14} className="fill-warning" />
                  <span className="text-sm font-semibold">{review.rating}</span>
                </div>
              </div>
              <p className="text-sm text-ink-body mt-3">{review.text}</p>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
