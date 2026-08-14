import {
  Building2,
  Car,
  GraduationCap,
  HeartPulse,
  ShoppingBag,
  Sparkles,
  Store,
  Utensils,
  Wrench,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  utensils: Utensils,
  "heart-pulse": HeartPulse,
  "shopping-bag": ShoppingBag,
  "graduation-cap": GraduationCap,
  wrench: Wrench,
  sparkles: Sparkles,
  car: Car,
  "building-2": Building2,
};

const FALLBACK_ICON: LucideIcon = Store;

const PALETTE = ["#3B82F6", "#F97316", "#8B5CF6", "#06B6D4", "#EC4899", "#F59E0B", "#10B981", "#EF4444"];

export function categoryIcon(icon: string | null): LucideIcon {
  if (!icon) return FALLBACK_ICON;
  return ICON_MAP[icon] ?? FALLBACK_ICON;
}

export function categoryColor(colorHex: string | null, index: number): string {
  return colorHex ?? PALETTE[index % PALETTE.length];
}

export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
