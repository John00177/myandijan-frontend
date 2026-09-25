import { Eye, EyeOff } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import type { TranslationKey } from "../../i18n";
import { ApiError, register as apiRegister } from "../../lib/api";
import type { RegisterPayload } from "../../types";
import Button from "../ui/Button";

interface RegisterFormProps {
  onSuccess: () => void;
}

const ROLES: { value: RegisterPayload["role"]; labelKey: TranslationKey }[] = [
  { value: "user", labelKey: "auth.role.customer" },
  { value: "owner", labelKey: "auth.role.owner" },
];

const inputClasses =
  "h-12 bg-elevated border border-white/[0.10] rounded-xl px-4 text-ink placeholder:text-ink-muted outline-none focus:border-primary/50";

export default function RegisterForm({ onSuccess }: RegisterFormProps) {
  const { t } = useLanguage();
  const { register } = useAuth();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("+998");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<RegisterPayload["role"]>("user");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await apiRegister({ fullName, phone, password, role });
      register(res.accessToken, res.user);
      onSuccess();
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : t("auth.registerError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <input
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        placeholder={t("auth.fullName")}
        className={inputClasses}
      />

      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="+998901234567"
        type="tel"
        className={inputClasses}
      />

      <div className="relative">
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t("auth.password")}
          type={showPassword ? "text" : "password"}
          className={`w-full pr-11 ${inputClasses}`}
        />
        <button
          type="button"
          onClick={() => setShowPassword((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 bg-elevated rounded-xl p-1">
        {ROLES.map((r) => (
          <button
            key={r.value}
            type="button"
            onClick={() => setRole(r.value)}
            className={`h-9 rounded-lg text-sm font-medium transition-colors ${
              role === r.value ? "bg-primary text-white" : "text-ink-muted hover:text-ink"
            }`}
          >
            {t(r.labelKey)}
          </button>
        ))}
      </div>

      {errorMessage && <p className="text-sm text-danger">{errorMessage}</p>}

      <Button type="submit" variant="primary" size="lg" className="w-full mt-1" disabled={submitting}>
        {submitting ? t("common.loading") : t("auth.register")}
      </Button>
    </form>
  );
}
