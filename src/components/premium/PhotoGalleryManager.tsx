import { ArrowLeft, ArrowRight, ImagePlus, Trash2 } from "lucide-react";
import { useState, type DragEvent } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { ApiError, uploadImage } from "../../lib/api";

interface PhotoGalleryManagerProps {
  photos: string[];
  onChange: (photos: string[]) => void;
  /** Featured plans lift this; Premium caps at 10. */
  maxPhotos?: number;
}

function reorder(list: string[], from: number, to: number): string[] {
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/**
 * Drag-to-reorder gallery. Position 0 is the cover photo, which is why the
 * order is worth managing at all.
 *
 * Dragging is the primary interaction, but every tile also carries left/right
 * buttons: HTML5 drag-and-drop does not work with a keyboard, and it is
 * unreliable on touch, so buttons are what actually make reordering possible
 * on a phone — the device most owners will manage their listing from.
 */
export default function PhotoGalleryManager({ photos, onChange, maxPhotos = 10 }: PhotoGalleryManagerProps) {
  const { t } = useLanguage();
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleDrop(e: DragEvent, index: number) {
    e.preventDefault();
    if (dragIndex == null || dragIndex === index) {
      setDragIndex(null);
      setOverIndex(null);
      return;
    }
    onChange(reorder(photos, dragIndex, index));
    setDragIndex(null);
    setOverIndex(null);
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= photos.length) return;
    onChange(reorder(photos, index, target));
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const { url } = await uploadImage(file);
      onChange([...photos, url]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.genericError"));
    } finally {
      setUploading(false);
    }
  }

  const canAddMore = photos.length < maxPhotos;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-ink">{t("photoGallery")}</h3>
        <span className="text-xs text-ink-muted">
          {photos.length} / {maxPhotos}
        </span>
      </div>
      <p className="mt-1 text-xs text-ink-muted">{t("photoGalleryHint")}</p>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((photo, index) => (
          <div
            key={`${photo}-${index}`}
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragEnd={() => {
              setDragIndex(null);
              setOverIndex(null);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setOverIndex(index);
            }}
            onDrop={(e) => handleDrop(e, index)}
            className={`group relative aspect-[4/3] cursor-grab overflow-hidden rounded-xl border bg-elevated active:cursor-grabbing ${
              overIndex === index && dragIndex !== index
                ? "border-primary ring-2 ring-primary/40"
                : "border-white/[0.10]"
            } ${dragIndex === index ? "opacity-50" : ""}`}
          >
            <img src={photo} alt="" className="h-full w-full object-cover" />

            {index === 0 && (
              <span className="absolute left-2 top-2 rounded-badge bg-gradient-to-r from-gold to-[#FFB300] px-2 py-[3px] text-[10px] font-bold uppercase tracking-wider text-[#3A2B00]">
                {t("coverPhotoLabel")}
              </span>
            )}

            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/80 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
              <div className="flex gap-1">
                <button
                  type="button"
                  aria-label="Chapga surish"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  className="flex size-7 items-center justify-center rounded-lg bg-black/60 text-white disabled:opacity-30"
                >
                  <ArrowLeft size={13} />
                </button>
                <button
                  type="button"
                  aria-label="O'ngga surish"
                  disabled={index === photos.length - 1}
                  onClick={() => move(index, 1)}
                  className="flex size-7 items-center justify-center rounded-lg bg-black/60 text-white disabled:opacity-30"
                >
                  <ArrowRight size={13} />
                </button>
              </div>
              <button
                type="button"
                aria-label={t("removePhoto")}
                onClick={() => onChange(photos.filter((_, i) => i !== index))}
                className="flex size-7 items-center justify-center rounded-lg bg-danger/80 text-white"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}

        {canAddMore && (
          <label className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/[0.15] bg-white/[0.02] text-ink-muted hover:border-primary/50 hover:text-ink-body">
            <ImagePlus size={20} />
            <span className="text-xs">{uploading ? t("uploading") : t("addPhoto")}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </label>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}
