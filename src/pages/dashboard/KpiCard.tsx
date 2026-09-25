import type { LucideIcon } from "lucide-react";
import Badge from "../../components/ui/Badge";

interface KpiCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend?: string;
  trendTone?: "blue" | "success" | "danger" | "amber";
}

export default function KpiCard({ icon: Icon, label, value, trend, trendTone = "blue" }: KpiCardProps) {
  return (
    <div className="bg-card border border-white/[0.08] rounded-xl p-5">
      <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
        <Icon size={18} />
      </div>
      <div className="text-2xl font-bold text-ink mt-3">{value}</div>
      <div className="text-sm text-ink-muted">{label}</div>
      {trend && (
        <Badge tone={trendTone} className="mt-1">
          {trend}
        </Badge>
      )}
    </div>
  );
}
