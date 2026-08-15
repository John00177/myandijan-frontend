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
    <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.2)] hover:border-white/[0.15] hover:shadow-[0_12px_40px_rgba(0,0,0,0.3)] transition-all duration-300 rounded-xl p-5">
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
