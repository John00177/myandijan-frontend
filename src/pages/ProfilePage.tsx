import { Briefcase, ChevronRight, Heart, LogOut, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AvatarPicker, { findPresetAvatar } from "../components/profile/AvatarPicker";
import MetaTags from "../components/seo/MetaTags";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import { fieldInputClasses } from "./dashboard/addBusiness/FormField";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { useFavorites } from "../hooks/useFavorites";
import { useMyClaims } from "../hooks/useMyClaims";
import { useRegions } from "../hooks/useRegions";
import { useRequireAuth } from "../hooks/useRequireAuth";
import { ApiError, updateProfile } from "../lib/api";
import { initials } from "../lib/initials";
import { localizedName } from "../lib/localize";
import type { UserRole } from "../types";

const ROLE_BADGE: Record<UserRole, { label: string; tone: "blue" | "amber" | "purple" }> = {
  CUSTOMER: { label: "Mijoz", tone: "blue" },
  BUSINESS_OWNER: { label: "Biznes egasi", tone: "amber" },
  MODERATOR: { label: "Moderator", tone: "purple" },
  SUPPORT: { label: "Qo'llab-quvvatlash", tone: "blue" },
  ADMIN: { label: "Admin", tone: "purple" },
  SUPER_ADMIN: { label: "Super Admin", tone: "purple" },
};

// Falls back to the raw role string instead of crashing if a future role
// ships without a matching entry here — this exact gap (ROLE_BADGE missing
// 3 of 6 roles) is what took the whole page down before.
const FALLBACK_BADGE = { label: "", tone: "blue" as const };

const GENDERS: { value: "MALE" | "FEMALE"; labelKey: "male" | "female" }[] = [
  { value: "MALE", labelKey: "male" },
  { value: "FEMALE", labelKey: "female" },
];

interface MenuItem {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}

export default function ProfilePage() {
  const { lang, t } = useLanguage();
  const navigate = useNavigate();
  const { user, isOwner, logout, updateUser } = useAuth();
  const { token } = useRequireAuth();
  const { favorites, loading: favoritesLoading } = useFavorites(lang, token);
  const { claims } = useMyClaims(token);
  const { regions } = useRegions(lang);
  const districts = regions[0]?.districts ?? [];

  const [avatarId, setAvatarId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<"MALE" | "FEMALE" | null>(null);
  const [districtId, setDistrictId] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "info" | "error"; text: string } | null>(null);

  // Re-seed the form whenever the underlying user changes (e.g. after a
  // successful save merges the response back in) rather than only on mount.
  useEffect(() => {
    if (!user) return;
    setAvatarId(user.avatarId ?? null);
    setEmail(user.email ?? "");
    setAge(user.age != null ? String(user.age) : "");
    setGender(user.gender ?? null);
    setDistrictId(user.districtId != null ? String(user.districtId) : "");
  }, [user]);

  // Auto-hides only the success notice — an error should stay up until the
  // user acts (retries, fixes the field) rather than vanish on its own timer.
  // A `useEffect` keyed on `notice`, not a bare setTimeout call at the save
  // site, so a second save (or unmount) before the 3s elapse can't fire a
  // stray setNotice(null) that clears a NEWER notice or a gone component —
  // same pattern MyBusinessesView/AdminBusinessesView already use for their
  // toasts.
  useEffect(() => {
    if (notice?.tone !== "success") return;
    const id = setTimeout(() => setNotice(null), 3000);
    return () => clearTimeout(id);
  }, [notice]);

  if (!token || !user) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8 text-center text-sm text-ink-muted">Yuklanmoqda...</div>
    );
  }

  const roleBadge = ROLE_BADGE[user.role] ?? { ...FALLBACK_BADGE, label: user.role };
  const selectedAvatar = findPresetAvatar(avatarId);

  const menuItems: MenuItem[] = [
    ...(isOwner
      ? [{ label: "Mening bizneslarim", icon: Briefcase, onClick: () => navigate(`/${lang}/dashboard`) }]
      : []),
    { label: "Saqlanganlar", icon: Heart, onClick: () => navigate(`/${lang}/favorites`) },
    { label: "Sozlamalar", icon: Settings, onClick: () => {} },
    {
      label: "Chiqish",
      icon: LogOut,
      onClick: () => {
        logout();
        navigate(`/${lang}`);
      },
    },
  ];

  async function handleSave() {
    setSaving(true);
    setNotice(null);

    const patch = {
      avatarId,
      email: email.trim() || null,
      age: age.trim() ? Number(age) : null,
      gender,
      districtId: districtId ? Number(districtId) : null,
    };

    try {
      // updateUser is fed the SERVER's response, never the local `patch` —
      // only the server can say what was actually persisted, and the banner
      // reads whatever lands here.
      const updated = await updateProfile(patch);
      updateUser(updated);
      setNotice({ tone: "success", text: t("profileUpdated") });
      // No redirect: staying put is what lets the user watch the banner
      // disappear against the same page they just filled in. Being bounced
      // to the homepage mid-save is what made a successful save and a failed
      // one look identical.
    } catch (err) {
      // NOTE: a 404 here is a real failure and must be surfaced as one.
      // This used to be special-cased as "the endpoint doesn't exist yet"
      // (true when this form was written, false since PATCH /users/me
      // shipped) and fell back to writing `patch` straight into
      // state + localStorage. That fallback is what produced the
      // long-standing "banner comes back" bug: the API rejects an unknown
      // districtId with 404 "District N not found", the frontend logged the
      // unsaved values locally anyway, the banner hid, and then the next
      // AuthProvider refresh pulled the real (still-empty) values from the
      // server and the banner reappeared. Never write unconfirmed data.
      setNotice({ tone: "error", text: err instanceof ApiError ? err.message : t("common.genericError") });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <MetaTags title="Profil — My Andijan" description="Foydalanuvchi profili." noIndex />

      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="bg-card border border-white/[0.08] rounded-2xl p-6 flex items-center gap-4">
          <div
            className={`size-16 rounded-full flex items-center justify-center shrink-0 ${
              selectedAvatar ? "text-3xl leading-none" : "bg-primary/20 text-primary text-2xl font-bold"
            }`}
            style={selectedAvatar ? { backgroundColor: selectedAvatar.bg } : undefined}
          >
            {selectedAvatar ? selectedAvatar.emoji : initials(user.fullName)}
          </div>
          <div>
            <div className="text-xl font-bold text-ink">{user.fullName}</div>
            <div className="text-sm text-ink-muted mt-1">{user.phone}</div>
            <Badge tone={roleBadge.tone} className="mt-2">
              {roleBadge.label}
            </Badge>
          </div>
        </div>

        <div className="bg-card border border-white/[0.08] rounded-2xl p-6 mt-6">
          <h2 className="text-lg font-bold text-ink">{t("profileInfo")}</h2>
          <div className="h-px bg-white/[0.08] my-4" />

          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink-body">{t("avatar")}</label>
              <AvatarPicker selectedId={avatarId} onSelect={setAvatarId} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="profile-email" className="text-sm font-medium text-ink-body">
                {t("email")}
              </label>
              <input
                id="profile-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={fieldInputClasses}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="profile-age" className="text-sm font-medium text-ink-body">
                {t("age")} <span className="text-danger">*</span>
              </label>
              <input
                id="profile-age"
                type="number"
                min={16}
                max={100}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className={fieldInputClasses}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink-body">
                {t("gender")} <span className="text-danger">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2 bg-elevated rounded-xl p-1">
                {GENDERS.map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setGender(g.value)}
                    className={`h-9 rounded-lg text-sm font-medium transition-colors ${
                      gender === g.value ? "bg-primary text-white" : "text-ink-muted hover:text-ink"
                    }`}
                  >
                    {t(g.labelKey)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="profile-district" className="text-sm font-medium text-ink-body">
                {t("city")} <span className="text-danger">*</span>
              </label>
              <select
                id="profile-district"
                value={districtId}
                onChange={(e) => setDistrictId(e.target.value)}
                className={`${fieldInputClasses} appearance-none`}
              >
                <option value="">{t("common.select")}</option>
                {districts.map((district) => (
                  <option key={district.id} value={district.id}>
                    {localizedName(district, lang)}
                  </option>
                ))}
              </select>
            </div>

            {notice && (
              <p
                className={`text-sm ${
                  notice.tone === "success" ? "text-success" : notice.tone === "error" ? "text-danger" : "text-ink-muted"
                }`}
              >
                {notice.text}
              </p>
            )}

            <Button variant="primary" size="lg" className="w-full" onClick={handleSave} disabled={saving}>
              {saving ? t("common.loading") : t("save")}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-6">
          <div className="bg-white/[0.03] rounded-xl p-4 text-center">
            <div className="text-xl font-bold text-ink">{favoritesLoading ? "—" : favorites.length}</div>
            <div className="text-xs text-ink-muted mt-1">Saqlanganlar</div>
          </div>
          <div className="bg-white/[0.03] rounded-xl p-4 text-center">
            <div className="text-xl font-bold text-ink">—</div>
            <div className="text-xs text-ink-muted mt-1">Sharhlar</div>
          </div>
          <div className="bg-white/[0.03] rounded-xl p-4 text-center">
            <div className="text-xl font-bold text-ink">—</div>
            <div className="text-xs text-ink-muted mt-1">Bizneslar</div>
          </div>
        </div>

        {claims.length > 0 && (
          <div className="bg-card border border-white/[0.08] rounded-2xl p-6 mt-6">
            <h2 className="text-lg font-bold text-ink">{t("businessClaim.myClaimsTitle")}</h2>
            <div className="h-px bg-white/[0.08] my-4" />
            <div className="flex flex-col gap-3">
              {claims.map((myClaim) => {
                const statusKey =
                  myClaim.status === "APPROVED"
                    ? "businessClaim.statusApproved"
                    : myClaim.status === "REJECTED"
                      ? "businessClaim.statusRejected"
                      : "businessClaim.statusPending";
                const statusTone =
                  myClaim.status === "APPROVED" ? "success" : myClaim.status === "REJECTED" ? "danger" : "amber";
                return (
                  <div key={myClaim.id} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-ink truncate">{myClaim.business?.name ?? "—"}</span>
                    <Badge tone={statusTone}>{t(statusKey)}</Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-6 space-y-2">
          {menuItems.map((item, i) => (
            <div key={item.label}>
              <button
                onClick={item.onClick}
                className="w-full flex items-center justify-between p-4 bg-white/[0.03] rounded-xl hover:bg-white/[0.06] cursor-pointer transition-colors"
              >
                <span className="flex items-center gap-3 text-ink font-medium">
                  <item.icon size={20} />
                  {item.label}
                </span>
                <ChevronRight size={16} className="text-ink-muted" />
              </button>
              {i < menuItems.length - 1 && <div className="h-px bg-white/[0.06] my-2" />}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
