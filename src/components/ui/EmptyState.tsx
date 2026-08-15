import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import Button from "./Button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  children?: ReactNode;
}

export default function EmptyState({ icon: Icon, title, body, actionLabel, onAction, children }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center text-center py-12">
      <Icon size={28} className="text-ink-muted" />
      <h3 className="font-semibold text-lg text-ink mt-3">{title}</h3>
      <p className="text-sm text-ink-muted max-w-[240px] mt-2">{body}</p>
      {actionLabel && (
        <Button variant="primary" size="sm" className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
      {children}
    </div>
  );
}
