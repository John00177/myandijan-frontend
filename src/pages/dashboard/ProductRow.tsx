import { Eye, EyeOff, Package, Pencil, Trash2, Wrench } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import type { MenuItem } from "../../types";

function formatSom(price: MenuItem["price"]): string {
  if (price == null) return "—";
  return `${Number(price).toLocaleString("uz-UZ")} so'm`;
}

interface ProductRowProps {
  product: MenuItem;
  /** Resolved from the real category list so the row shows a name, not an id. */
  categoryName: string | null;
  confirmingDelete: boolean;
  busy: boolean;
  onEdit: () => void;
  onToggleActive: () => void;
  onRequestDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}

export default function ProductRow({
  product,
  categoryName,
  confirmingDelete,
  busy,
  onEdit,
  onToggleActive,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
}: ProductRowProps) {
  const isService = product.type === "SERVICE";
  // Undefined means the API didn't send it; the column defaults to true, so an
  // item counts as published unless it explicitly says otherwise.
  const isActive = product.isActive !== false;
  const TypeIcon = isService ? Wrench : Package;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-card border border-white/[0.08] rounded-xl">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#1F2C38] to-[#121A22] flex items-center justify-center shrink-0 overflow-hidden">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <TypeIcon size={18} className="text-ink-muted/50" />
          )}
        </div>
        <div className="min-w-0">
          <div className={`font-semibold truncate ${isActive ? "text-ink" : "text-ink-muted"}`}>{product.name}</div>
          {product.description && <div className="text-xs text-ink-muted truncate">{product.description}</div>}
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap sm:shrink-0">
        <Badge tone={isService ? "purple" : "neutral"}>{isService ? "Xizmat" : "Mahsulot"}</Badge>
        {categoryName && <Badge tone="cyan">{categoryName}</Badge>}
        <span className="text-sm font-medium text-ink whitespace-nowrap">{formatSom(product.price)}</span>
        <Badge tone={isActive ? "success" : "neutral"}>{isActive ? "E'lon qilingan" : "Yashirilgan"}</Badge>
      </div>

      {confirmingDelete ? (
        <div className="flex items-center gap-2 sm:shrink-0">
          <span className="text-sm text-danger">O'chirishni tasdiqlang</span>
          <Button
            variant="primary"
            size="sm"
            className="!bg-danger hover:!bg-danger/80"
            disabled={busy}
            onClick={onConfirmDelete}
          >
            Ha, o'chirish
          </Button>
          <Button variant="ghost" size="sm" disabled={busy} onClick={onCancelDelete}>
            Bekor
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-1 sm:shrink-0">
          <button
            onClick={onToggleActive}
            disabled={busy}
            aria-label={isActive ? "Yashirish" : "E'lon qilish"}
            title={isActive ? "Yashirish" : "E'lon qilish"}
            className="size-8 rounded-lg text-ink-muted hover:text-ink hover:bg-white/[0.05] flex items-center justify-center transition-colors disabled:opacity-50"
          >
            {isActive ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
          <button
            onClick={onEdit}
            disabled={busy}
            aria-label="Tahrirlash"
            className="size-8 rounded-lg text-ink-muted hover:text-ink hover:bg-white/[0.05] flex items-center justify-center transition-colors disabled:opacity-50"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={onRequestDelete}
            disabled={busy}
            aria-label="O'chirish"
            className="size-8 rounded-lg text-ink-muted hover:text-danger hover:bg-danger/10 flex items-center justify-center transition-colors disabled:opacity-50"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
