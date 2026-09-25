import { Star, X } from "lucide-react";
import { useEffect, useState } from "react";
import Button from "../ui/Button";
import Card from "../ui/Card";
import { useLanguage } from "../../contexts/LanguageContext";
import { ApiError, createBusinessReview, uploadImage } from "../../lib/api";

interface ReviewFormProps {
  businessId: number;
  onDone: () => void;
}

interface PhotoPick {
  file: File;
  previewUrl: string;
}

export default function ReviewForm({ businessId, onDone }: ReviewFormProps) {
  const { t } = useLanguage();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [photos, setPhotos] = useState<PhotoPick[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Revoke every blob: preview URL on unmount so a form the user never
  // submits doesn't leak memory for the rest of the tab's life.
  useEffect(() => {
    return () => {
      photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addFiles(files: FileList | null) {
    if (!files) return;
    const picked = Array.from(files).map((file) => ({ file, previewUrl: URL.createObjectURL(file) }));
    setPhotos((prev) => [...prev, ...picked]);
  }

  function removePhoto(index: number) {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function submit() {
    if (rating < 1 || !comment.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      // Sequential, not Promise.all — a slow/flaky connection makes several
      // simultaneous uploads worse, not faster, and the "N/total" progress
      // this enables is worth more to the user than the small time saved.
      const urls: string[] = [];
      setUploadProgress(photos.length ? { done: 0, total: photos.length } : null);
      for (const photo of photos) {
        const { url } = await uploadImage(photo.file);
        urls.push(url);
        setUploadProgress({ done: urls.length, total: photos.length });
      }

      await createBusinessReview(businessId, {
        rating,
        comment: comment.trim(),
        photos: urls.length ? urls : undefined,
      });

      photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      setRating(0);
      setComment("");
      setPhotos([]);
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("reviewSubmitError"));
    } finally {
      setSubmitting(false);
      setUploadProgress(null);
    }
  }

  const buttonLabel = uploadProgress
    ? `${t("uploading")} ${uploadProgress.done}/${uploadProgress.total}...`
    : submitting
      ? `${t("sending")}...`
      : t("send");

  return (
    <Card className="p-4 mb-4">
      <p className="text-sm font-medium text-ink mb-2">{t("writeReview")}</p>
      <div className="flex items-center gap-1 mb-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setRating(i + 1)}
            aria-label={`${i + 1} ${t("star")}`}
            className="p-0.5"
          >
            <Star size={22} className={i < rating ? "fill-warning text-warning" : "text-ink-muted"} />
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder={t("yourThoughts")}
        rows={3}
        className="w-full h-auto py-2.5 px-3 bg-elevated border border-white/[0.10] rounded-xl text-sm text-ink placeholder:text-ink-muted outline-none focus:border-primary/50 resize-none"
      />

      {photos.length > 0 && (
        <div className="flex gap-2 mt-2 flex-wrap">
          {photos.map((p, i) => (
            <div key={p.previewUrl} className="relative size-16 shrink-0">
              <img src={p.previewUrl} alt="" className="w-full h-full object-cover rounded-lg border border-white/[0.10]" />
              <button
                type="button"
                onClick={() => removePhoto(i)}
                aria-label={t("removePhoto")}
                className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-danger text-white flex items-center justify-center"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <label className="mt-2 h-11 flex items-center justify-center gap-2 bg-elevated border border-dashed border-white/[0.15] rounded-xl text-sm text-ink-muted cursor-pointer hover:border-primary/50">
        {t("addPhotos")}
        <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
      </label>

      {error && <p className="text-xs text-danger mt-2">{error}</p>}
      <Button
        size="md"
        variant="primary"
        className="mt-3"
        disabled={submitting || rating < 1 || !comment.trim()}
        onClick={submit}
      >
        {buttonLabel}
      </Button>
    </Card>
  );
}
