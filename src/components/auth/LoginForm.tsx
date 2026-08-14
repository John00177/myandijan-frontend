import { Eye, EyeOff } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { ApiError, login as apiLogin } from "../../lib/api";
import Button from "../ui/Button";

interface LoginFormProps {
  onSuccess: () => void;
  onForgotPassword: () => void;
}

export default function LoginForm({ onSuccess, onForgotPassword }: LoginFormProps) {
  const { t } = useLanguage();
  const { login } = useAuth();
  const [phone, setPhone] = useState("+998");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await apiLogin({ phone, password });
      login(res.accessToken, res.user);
      onSuccess();
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : t("auth.loginError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="+998901234567"
        type="tel"
        className="h-12 bg-elevated border border-white/[0.10] rounded-xl px-4 text-ink placeholder:text-ink-muted outline-none focus:border-primary/50"
      />

      <div>
        <div className="relative">
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("auth.password")}
            type={showPassword ? "text" : "password"}
            className="h-12 w-full bg-elevated border border-white/[0.10] rounded-xl px-4 pr-11 text-ink placeholder:text-ink-muted outline-none focus:border-primary/50"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        <button
          type="button"
          onClick={onForgotPassword}
          className="mt-2 text-sm text-primary hover:text-blue-300 transition-colors"
        >
          {t("auth.forgotPassword")}
        </button>
      </div>

      {errorMessage && <p className="text-sm text-danger">{errorMessage}</p>}

      <Button type="submit" variant="primary" size="lg" className="w-full mt-1" disabled={submitting}>
        {submitting ? t("common.loading") : t("auth.login")}
      </Button>
    </form>
  );
}
