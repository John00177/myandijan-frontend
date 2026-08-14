import { ChevronDown } from "lucide-react";

interface FilterOption {
  value: string;
  label: string;
}

interface FilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  allLabel: string;
}

export default function FilterSelect({ value, onChange, options, allLabel }: FilterSelectProps) {
  const isActive = value !== "";

  return (
    <div
      className={`relative h-8 px-3 rounded-lg border flex items-center gap-1.5 cursor-pointer text-sm ${
        isActive
          ? "bg-primary/[0.15] border-primary/30 text-primary"
          : "bg-white/[0.05] border-white/[0.10] text-ink-body hover:bg-white/[0.08] hover:border-white/[0.20]"
      }`}
    >
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      >
        <option value="">{allLabel}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none truncate max-w-[140px]">
        {isActive ? options.find((o) => o.value === value)?.label ?? allLabel : allLabel}
      </span>
      <ChevronDown size={14} className="pointer-events-none shrink-0" />
    </div>
  );
}
