import { motion, type Transition } from "framer-motion";
import { Search } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext";
import type { TranslationKey } from "../../i18n";
import { INSTANT, TRANSITIONS, useShouldAnimate } from "../../lib/motion-config";

const CHIPS: { labelKey: TranslationKey; slug: string }[] = [
  { labelKey: "hero.chip.restaurants", slug: "oziq-ovqat" },
  { labelKey: "hero.chip.hospitals", slug: "sogliq" },
  { labelKey: "hero.chip.shops", slug: "sotuv" },
  { labelKey: "hero.chip.banks", slug: "xizmatlar" },
  { labelKey: "hero.chip.taxi", slug: "avto" },
  { labelKey: "hero.chip.education", slug: "talim" },
];

/*
 * No weather here. The hero used to show four hard-coded cards (fixed
 * temperatures, conditions and "tomorrow" forecasts for Andijon, Asaka,
 * Shahrixon, Baliqchi) that no source backed — presenting them as current
 * weather was misleading. They were removed in Phase 0 rather than replaced
 * with other guessed values. Bring weather back only with a verified provider
 * (an owner decision: provider, terms, credentials), and keep
 * `src/pages/__tests__/HeroSection.test.tsx` honest when you do.
 */

export default function HeroSection() {
  const { lang, t } = useLanguage();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const shouldAnimate = useShouldAnimate();

  /** Delays are dropped entirely under reduced motion, not just shortened. */
  const enter = (delay: number): Transition => (shouldAnimate ? { ...TRANSITIONS.hero, delay } : INSTANT);

  /**
   * `initial={false}` under reduced motion makes Framer render straight at the
   * animate state, so no element ever mounts with opacity 0.
   */
  const fadeUp = shouldAnimate ? { opacity: 0, y: 30 } : false;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    navigate(`/${lang}/search?q=${encodeURIComponent(trimmed)}`);
  }

  function goToCategory(slug: string) {
    navigate(`/${lang}/search?category=${slug}`);
  }

  return (
    <section className="relative min-h-[600px] bg-gradient-to-br from-base via-[#0F172A] to-[#1E3A5F] overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(circle at 85% 0%, rgba(59,130,246,0.14), transparent 55%)",
        }}
      />

      <div className="relative max-w-7xl mx-auto px-6 pt-32 pb-20">
        <motion.h1
          className="text-5xl md:text-6xl font-extrabold text-ink tracking-tight"
          initial={fadeUp}
          animate={{ opacity: 1, y: 0 }}
          transition={enter(0)}
        >
          <span className="block">{t("hero.title.line1")}</span>
          <span className="block text-accent">{t("hero.title.line2")}</span>
        </motion.h1>

        <motion.p
          className="text-lg text-ink-body mt-4 max-w-xl"
          initial={fadeUp}
          animate={{ opacity: 1, y: 0 }}
          transition={enter(0.1)}
        >
          {t("hero.subtitle")}
        </motion.p>

        <motion.form
          onSubmit={handleSubmit}
          className="mt-8 max-w-2xl"
          initial={shouldAnimate ? { opacity: 0, y: 30, scale: 0.95 } : false}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={enter(0.2)}
        >
          <div className="h-14 bg-surface/80 backdrop-blur-xl border border-white/[0.10] rounded-2xl flex items-center px-4 gap-3 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20">
            <Search size={20} className="text-ink-muted shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("search.placeholder")}
              className="flex-1 min-w-0 bg-transparent text-base text-ink placeholder:text-ink-muted outline-none"
            />
            <button
              type="submit"
              className="h-10 px-6 bg-primary hover:bg-blue-400 text-white font-semibold rounded-xl flex items-center gap-2 shrink-0 active:scale-[0.97] transition-transform"
            >
              <span className="hidden md:inline">{t("search.button")}</span>
              <Search size={18} className="md:hidden" />
            </button>
          </div>
        </motion.form>

        <motion.div
          className="flex gap-2 flex-wrap mt-4"
          initial={shouldAnimate ? "hidden" : false}
          animate="visible"
          variants={{
            hidden: {},
            visible: {
              transition: shouldAnimate ? { delayChildren: 0.3, staggerChildren: 0.03 } : {},
            },
          }}
        >
          {CHIPS.map((chip) => (
            <motion.button
              key={chip.slug}
              type="button"
              onClick={() => goToCategory(chip.slug)}
              variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
              transition={shouldAnimate ? TRANSITIONS.hero : INSTANT}
              whileTap={{ scale: 0.97 }}
              className="h-9 px-4 rounded-full bg-white/[0.05] border border-white/[0.10] text-sm text-ink-body hover:bg-white/[0.08] hover:border-white/[0.20] transition-colors cursor-pointer"
            >
              {t(chip.labelKey)}
            </motion.button>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
