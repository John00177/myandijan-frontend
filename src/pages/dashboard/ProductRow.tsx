import { Package, Pencil, Trash2 } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import type { Product } from "./mockData";

function formatSom(amount: number): string {
  return `${amount.toLocaleString("uz-UZ")} so'm`;
}

interface ProductRowProps {
  product: Product;
  confirmingDelete: boolean;
  onEdit: () => void;
  onRequestDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}

export default function ProductRow({
  product,
  confirmingDelete,
  onEdit,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
}: ProductRowProps) {
  const inStock = product.quantity > 0;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-card border border-white/[0.08] rounded-xl">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#1F2C38] to-[#121A22] flex items-center justify-center shrink-0">
          <Package size={18} className="text-ink-muted/50" />
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-ink truncate">{product.name}</div>
          <div className="text-xs text-ink-muted">SKU: #{product.sku}</div>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap sm:shrink-0">
        <Badge tone="neutral">{product.category}</Badge>
        <span className="text-sm font-medium text-ink whitespace-nowrap">{formatSom(product.price)}</span>
        <span className="text-sm text-ink-muted whitespace-nowrap">Soni: {product.quantity}</span>
        <Badge tone={inStock ? "success" : "danger"}>{inStock ? "Sotuvda" : "Tugagan"}</Badge>
      </div>

      {confirmingDelete ? (
        <div className="flex items-center gap-2 sm:shrink-0">
          <span className="text-sm text-danger">O'chirishni tasdiqlang</span>
          <Button variant="primary" size="sm" className="!bg-danger hover:!bg-danger/80" onClick={onConfirmDelete}>
            Ha, o'chirish
          </Button>
          <Button variant="ghost" size="sm" onClick={onCancelDelete}>
            Bekor
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-1 sm:shrink-0">
          <button
            onClick={onEdit}
            aria-label="Tahrirlash"
            className="size-8 rounded-lg text-ink-muted hover:text-ink hover:bg-white/[0.05] flex items-center justify-center transition-colors"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={onRequestDelete}
            aria-label="O'chirish"
            className="size-8 rounded-lg text-ink-muted hover:text-danger hover:bg-danger/10 flex items-center justify-center transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
