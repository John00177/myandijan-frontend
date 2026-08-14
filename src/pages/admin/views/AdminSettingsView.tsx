import { useState } from "react";
import Button from "../../../components/ui/Button";

const inputClasses =
  "h-12 bg-elevated border border-white/[0.10] rounded-xl px-4 text-ink placeholder:text-ink-muted outline-none focus:border-primary/50";

export default function AdminSettingsView() {
  const [platformName, setPlatformName] = useState("My Andijan");
  const [contactEmail, setContactEmail] = useState("");
  const [telegram, setTelegram] = useState("");
  const [defaultLang, setDefaultLang] = useState("UZ");
  const [maintenance, setMaintenance] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  // /admin/settings returns 404 — saving is local only until that route exists.
  function handleSave() {
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="flex flex-col gap-4">
        <div>
          <label className="text-sm text-ink-muted mb-2 block">Platforma nomi</label>
          <input
            value={platformName}
            onChange={(e) => setPlatformName(e.target.value)}
            className={`${inputClasses} w-full`}
          />
        </div>

        <div>
          <label className="text-sm text-ink-muted mb-2 block">Aloqa email</label>
          <input
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            type="email"
            placeholder="info@myandijan.uz"
            className={`${inputClasses} w-full`}
          />
        </div>

        <div>
          <label className="text-sm text-ink-muted mb-2 block">Telegram havolasi</label>
          <input
            value={telegram}
            onChange={(e) => setTelegram(e.target.value)}
            placeholder="https://t.me/myandijan"
            className={`${inputClasses} w-full`}
          />
        </div>

        <div>
          <label className="text-sm text-ink-muted mb-2 block">Asosiy til</label>
          <select
            value={defaultLang}
            onChange={(e) => setDefaultLang(e.target.value)}
            className={`${inputClasses} w-full`}
          >
            <option value="UZ">UZ</option>
            <option value="RU">RU</option>
            <option value="EN">EN</option>
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between p-4 bg-white/[0.03] rounded-xl">
        <div>
          <div className="text-sm font-medium text-ink">Texnik xizmat rejimi</div>
          <div className="text-xs text-ink-muted mt-0.5">Saytni vaqtincha yopish</div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={maintenance}
          aria-label="Texnik xizmat rejimi"
          onClick={() => setMaintenance((v) => !v)}
          className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${
            maintenance ? "bg-primary" : "bg-white/[0.10]"
          }`}
        >
          <span
            className={`absolute top-1 size-5 rounded-full bg-white transition-all ${
              maintenance ? "left-6" : "left-1"
            }`}
          />
        </button>
      </div>

      <Button variant="primary" size="lg" className="w-full" onClick={handleSave}>
        {justSaved ? "Saqlandi ✓" : "Saqlash"}
      </Button>
    </div>
  );
}
