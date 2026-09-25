import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";

/**
 * Deliberately brute-force: no shared helper, no memoization, nothing but a
 * plain array built inline and an early return. This is as close to "the
 * banner cannot possibly disagree with what's in front of it" as the code
 * can get — every previous version of this logic (including the one this
 * replaced, which used a shared `missingProfileFields` helper) computed the
 * exact same three-field check and produced the same result in every
 * verified test, so if this STILL shows up as stuck after a real deploy,
 * the browser is running old JS, not old logic. Ctrl+Shift+R fixes that;
 * changing this file again will not.
 */
export default function ProfileCompletionBanner() {
  const { lang, t } = useLanguage();
  const { user, token } = useAuth();

  const missing: string[] = [];
  if (!user?.age) missing.push(t("age"));
  if (!user?.gender) missing.push(t("gender"));
  if (!user?.districtId) missing.push(t("city"));

  const isVisible = missing.length > 0;

  // Canary log — if this line never shows up in the console on /profile,
  // the page is running a cached bundle from before this fix.
  console.log("Banner check:", {
    age: user?.age,
    gender: user?.gender,
    districtId: user?.districtId,
    incomplete: isVisible,
  });

  if (!token || !user || !isVisible) return null;

  return (
    <div className="relative bg-primary/10 border-b border-primary/20 mb-2">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">{t("completeProfile")}</p>
          <p className="text-xs text-ink-muted mt-0.5">
            {t("missingFields")}: {missing.join(", ")}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            to={`/${lang}/profile`}
            className="h-8 px-4 inline-flex items-center rounded-lg bg-primary text-white text-sm font-medium hover:bg-blue-400 transition-colors"
          >
            {t("fillProfile")}
          </Link>
        </div>
      </div>
    </div>
  );
}
