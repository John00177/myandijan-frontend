import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function pageWindow(page: number, totalPages: number): number[] {
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const end = Math.min(totalPages, Math.max(page + 2, 5));
  const pages: number[] = [];
  for (let p = Math.max(1, start); p <= end; p++) pages.push(p);
  return pages;
}

export default function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      <button
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="h-9 px-4 rounded-lg bg-card border border-white/[0.10] text-ink-body hover:border-primary/30 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
      >
        <ChevronLeft size={16} />
        Oldingi
      </button>

      {pageWindow(page, totalPages).map((p) => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className={`size-9 rounded-lg flex items-center justify-center text-sm ${
            p === page ? "bg-primary text-white" : "text-ink-muted hover:bg-white/[0.05]"
          }`}
        >
          {p}
        </button>
      ))}

      <button
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className="h-9 px-4 rounded-lg bg-card border border-white/[0.10] text-ink-body hover:border-primary/30 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
      >
        Keyingi
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
