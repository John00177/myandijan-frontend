import { Camera, User } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLanguage } from "../../contexts/LanguageContext";

interface ProfileScreenProps {
  submitting: boolean;
  error: string | null;
  onSubmit: (input: { firstName: string; lastName: string; avatar: File | null }) => void;
  onSkip: () => void;
}

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export default function ProfileScreen({ submitting, error, onSubmit, onSkip }: ProfileScreenProps) {
  const { t } = useLanguage();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Object URLs are leaked memory until revoked, and a new one is minted every
  // time the user picks a different photo.
  useEffect(() => {
    if (!avatar) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(avatar);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatar]);

  function handleFile(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_AVATAR_BYTES) {
      setLocalError(t("signup.errorPhotoTooLarge"));
      return;
    }
    if (file.type && !file.type.startsWith("image/")) {
      setLocalError(t("signup.errorPhotoType"));
      return;
    }
    setLocalError(null);
    setAvatar(file);
  }

  const canSubmit = firstName.trim().length > 0 && lastName.trim().length > 0;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    onSubmit({ firstName: firstName.trim(), lastName: lastName.trim(), avatar });
  }

  const inputClasses =
    "h-14 w-full rounded-xl border-2 border-white/[0.10] bg-elevated px-4 text-base text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-primary focus:ring-4 focus:ring-primary/20";

  return (
    <div className="flex flex-col">
      <h1 className="text-2xl font-bold text-ink sm:text-3xl">{t("signup.profileTitle")}</h1>
      <p className="mt-2 text-sm text-ink-muted">{t("signup.profileSubtitle")}</p>

      <form onSubmit={handleSubmit} className="mt-7 flex flex-col">
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="group relative size-24 overflow-hidden rounded-full border-2 border-dashed border-white/[0.15] bg-elevated transition-colors hover:border-primary/50"
            aria-label={t("signup.photoUpload")}
          >
            {preview ? (
              <img src={preview} alt="" className="size-full object-cover" />
            ) : (
              <span className="flex size-full items-center justify-center text-ink-muted">
                <User size={30} />
              </span>
            )}
            <span className="absolute inset-x-0 bottom-0 flex h-7 items-center justify-center bg-black/60 text-white">
              <Camera size={14} />
            </span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder={t("signup.firstName")}
            autoComplete="given-name"
            aria-label={t("signup.firstName")}
            className={inputClasses}
          />
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder={t("signup.lastName")}
            autoComplete="family-name"
            aria-label={t("signup.lastName")}
            className={inputClasses}
          />
        </div>

        {(localError || error) && (
          <p role="alert" className="mt-3 text-sm text-red-500">
            {localError ?? error}
          </p>
        )}

        <button
          type="submit"
          disabled={!canSubmit || submitting}
          className="mt-6 h-14 w-full rounded-full bg-primary text-lg font-semibold text-white transition-colors hover:bg-blue-600 disabled:opacity-60"
        >
          {submitting ? t("common.loading") : t("signup.saveAndContinue")}
        </button>

        {/* The account already exists by this point, so skipping is a real exit,
            not an abandoned signup. */}
        <button
          type="button"
          onClick={onSkip}
          className="mt-3 h-12 w-full rounded-full text-base font-medium text-ink-muted transition-colors hover:text-ink"
        >
          {t("signup.skipProfile")}
        </button>
      </form>
    </div>
  );
}
