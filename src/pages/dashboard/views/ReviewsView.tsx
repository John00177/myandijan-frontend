import { Star } from "lucide-react";
import { useState } from "react";
import Button from "../../../components/ui/Button";
import { initials } from "../../../lib/initials";
import { MOCK_REVIEWS, type MockReview } from "../mockData";

function ReviewCard({ review }: { review: MockReview }) {
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sentReply, setSentReply] = useState(review.ownerReply);

  function handleSend() {
    if (!replyText.trim()) return;
    setSentReply(replyText.trim());
    setReplying(false);
  }

  return (
    <div className="bg-card border border-white/[0.08] rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className="size-9 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold shrink-0">
          {initials(review.authorName)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-ink">{review.authorName}</div>
          <div className="text-xs text-ink-muted">
            {review.businessName} · {review.timeAgo}
          </div>
        </div>
        <div className="flex items-center gap-1 text-warning shrink-0">
          <Star size={14} className="fill-warning" />
          <span className="text-sm font-semibold">{review.rating}</span>
        </div>
      </div>

      <p className="text-sm text-ink-body mt-3">{review.text}</p>

      {sentReply ? (
        <div className="mt-3 pl-3 border-l-2 border-primary/30">
          <div className="text-xs font-medium text-primary">Sizning javob</div>
          <p className="text-sm text-ink-body mt-1">{sentReply}</p>
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
          <div className="flex gap-2 mt-2">
            <Button variant="primary" size="sm" onClick={handleSend}>
              Yuborish
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setReplying(false)}>
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
  return (
    <div className="flex flex-col gap-3">
      {MOCK_REVIEWS.map((review) => (
        <ReviewCard key={review.id} review={review} />
      ))}
    </div>
  );
}
