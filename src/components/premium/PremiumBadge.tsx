import { motion } from "framer-motion";
import { BadgeCheck, Crown, Flame, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { useShouldAnimate } from "../../lib/motion-config";
import type { PremiumTier } from "../../lib/premium";

export type BadgeVariant = "premium" | "featured" | "verified" | "sponsor";

interface VariantStyle {
  className: string;
  icon: typeof Crown | null;
  labelUz: string;
  labelRu: string;
}

/*
 * Gold is reserved for paid placement (premium/featured) so it always means
 * the same thing to a reader. "Verified" is trust, not money — it stays blue,
 * and "Sponsor" is deliberately the quietest of the four: an ad label has to
 * be legible without competing with the listing it labels.
 */
const VARIANTS: Record<BadgeVariant, VariantStyle> = {
  premium: {
    className: "bg-gradient-to-r from-gold/20 to-gold-deep/20 text-gold border-gold/40",
    icon: Crown,
    labelUz: "Premium",
    labelRu: "Премиум",
  },
  featured: {
    className: "bg-gradient-to-r from-gold to-[#FFB300] text-[#3A2B00] border-gold",
    icon: Sparkles,
    labelUz: "Tavsiya etilgan",
    labelRu: "Рекомендуем",
  },
  verified: {
    className: "bg-primary/[0.12] text-blue-300 border-primary/30",
    icon: BadgeCheck,
    labelUz: "Tasdiqlangan",
    labelRu: "Подтверждено",
  },
  sponsor: {
    className: "bg-white/[0.06] text-ink-muted border-white/[0.12]",
    icon: null,
    labelUz: "Reklama",
    labelRu: "Реклама",
  },
};

interface PremiumBadgeProps {
  variant: BadgeVariant;
  /** Uzbek label with the Russian underneath, for the bilingual surfaces. */
  bilingual?: boolean;
  className?: string;
}

export default function PremiumBadge({ variant, bilingual = false, className = "" }: PremiumBadgeProps) {
  const style = VARIANTS[variant];
  const Icon = style.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-badge border px-2 py-[3px] text-[10px] font-bold uppercase tracking-wider ${style.className} ${className}`}
    >
      {Icon && <Icon size={11} />}
      {bilingual ? `${style.labelUz} · ${style.labelRu}` : style.labelUz}
    </span>
  );
}

const TIER_STYLES: Record<Exclude<PremiumTier, "none">, { ring: string; text: string; label: string }> = {
  gold: { ring: "from-gold to-[#FFB300]", text: "text-[#3A2B00]", label: "Gold" },
  silver: { ring: "from-silver to-[#8B95A3]", text: "text-[#1B2430]", label: "Silver" },
  bronze: { ring: "from-bronze to-[#8C5A21]", text: "text-[#2B1500]", label: "Bronze" },
};

/** Gold/silver/bronze tier chip — shown where the exact tier matters (dashboard, pricing). */
export function TierBadge({ tier, className = "" }: { tier: PremiumTier; className?: string }) {
  if (tier === "none") return null;
  const style = TIER_STYLES[tier];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-badge bg-gradient-to-r ${style.ring} ${style.text} px-2 py-[3px] text-[10px] font-bold uppercase tracking-wider ${className}`}
    >
      <Crown size={11} />
      {style.label}
    </span>
  );
}

/**
 * "Top Rated" flame. The flame pulses to draw the eye, but only when the
 * viewer hasn't asked for reduced motion — an always-animating badge on a
 * grid of cards is exactly the kind of thing that setting exists for.
 */
export function TopRatedBadge({ className = "" }: { className?: string }) {
  const shouldAnimate = useShouldAnimate();

  const flame: ReactNode = shouldAnimate ? (
    <motion.span
      className="flex"
      animate={{ scale: [1, 1.18, 1], rotate: [0, -6, 6, 0] }}
      transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
    >
      <Flame size={11} className="fill-current" />
    </motion.span>
  ) : (
    <Flame size={11} className="fill-current" />
  );

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-badge border border-danger/40 bg-gradient-to-r from-danger/25 to-warning/25 px-2 py-[3px] text-[10px] font-bold uppercase tracking-wider text-warning ${className}`}
    >
      {flame}
      Top
    </span>
  );
}
