import { Building2 } from "lucide-react";
import { useState } from "react";
import Button from "../../components/ui/Button";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { useMyClaims } from "../../hooks/useMyClaims";
import { ApiError, createClaim } from "../../lib/api";
import type { Business } from "../../types";

interface ClaimBusinessSectionProps {
  business: Business;
}

/**
 * Only for a directory listing nobody has claimed yet (ownerId null — see
 * OwnerService.createClaim). Distinct from the unrelated /claim ("add a new
 * business") flow — this is for an EXISTING listing someone already runs.
 */
export default function ClaimBusinessSection({ business }: ClaimBusinessSectionProps) {
  const { t } = useLanguage();
  const { token, openAuthModal } = useAuth();
  const [open, setOpen] = useState(false);
  const [evidence, setEvidence] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactNote, setContactNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  // Phase 16D: after a reload the claimant should see their pending claim, not
  // the CTA again (a second claim would only answer 409). Fetched only for a
  // signed-in viewer of an unowned listing; useMyClaims reads the newest 20
  // claims, which covers any realistic claimant.
  const { claims, loading: claimsLoading } = useMyClaims(business.ownerId == null ? token : null);

  if (business.ownerId != null) return null;

  const hasPendingClaim = claims.some((c) => c.status === "PENDING" && c.business?.id === business.id);

  function handleStart() {
    if (!token) {
      openAuthModal();
      return;
    }
    setOpen(true);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      await createClaim({
        businessId: business.id,
        evidence: evidence.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        contactNote: contactNote.trim() || undefined,
      });
      setSubmitted(true);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) setError(t("claim.errorAuthRequired"));
        else if (err.status === 409) setError(t("businessClaim.errorConflict"));
        else setError(err.message || t("common.genericError"));
      } else {
        setError(t("claim.errorNetwork"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted || hasPendingClaim) {
    return (
      <div className="mt-6 rounded-xl border border-success/30 bg-success/10 p-4">
        <p className="text-sm font-medium text-success">
          {t(submitted ? "businessClaim.submittedTitle" : "businessClaim.pendingTitle")}
        </p>
        <p className="text-sm text-ink-muted mt-1">{t("businessClaim.submittedBody")}</p>
      </div>
    );
  }

  // Signed in and still loading the claims: render nothing rather than flash
  // the CTA and then swap it out. If the request fails, the CTA comes back and
  // the API's 409 still guards a duplicate.
  if (token && claimsLoading) return null;

  return (
    <div className="mt-6 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
      <div className="flex items-start gap-3">
        <Building2 size={20} className="text-primary shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink">{t("businessClaim.ctaTitle")}</p>
          <p className="text-sm text-ink-muted mt-1">{t("businessClaim.ctaBody")}</p>

          {!open ? (
            <Button variant="secondary" size="sm" className="mt-3" onClick={handleStart}>
              {t("businessClaim.ctaButton")}
            </Button>
          ) : (
            <div className="mt-3 flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-ink-body">{t("businessClaim.evidenceLabel")}</label>
                <textarea
                  value={evidence}
                  onChange={(e) => setEvidence(e.target.value)}
                  placeholder={t("businessClaim.evidencePlaceholder")}
                  rows={3}
                  className="bg-elevated border border-white/[0.10] rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-primary/50 resize-none"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-ink-body">{t("businessClaim.contactPhoneLabel")}</label>
                <input
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="h-10 bg-elevated border border-white/[0.10] rounded-lg px-3 text-sm text-ink outline-none focus:border-primary/50"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-ink-body">{t("businessClaim.contactNoteLabel")}</label>
                <input
                  value={contactNote}
                  onChange={(e) => setContactNote(e.target.value)}
                  className="h-10 bg-elevated border border-white/[0.10] rounded-lg px-3 text-sm text-ink outline-none focus:border-primary/50"
                />
              </div>

              {error && <p className="text-sm text-danger">{error}</p>}

              <div className="flex gap-2">
                <Button variant="primary" size="sm" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? t("common.loading") : t("businessClaim.submit")}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={submitting}>
                  {t("businessClaim.cancel")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
