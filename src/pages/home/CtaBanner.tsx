import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext";

export default function CtaBanner() {
  const { lang, t } = useLanguage();
  const navigate = useNavigate();

  return (
    <section className="max-w-7xl mx-auto px-6 py-16">
      <div className="rounded-2xl bg-gradient-to-r from-primary/20 via-accent/10 to-secondary/20 border border-primary/20 p-8 md:p-12 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-ink">{t("cta.title")}</h2>
        <p className="text-ink-body mt-3 max-w-lg mx-auto">{t("cta.subtitle")}</p>
        <button
          onClick={() => navigate(`/${lang}/search`)}
          className="mt-6 h-12 px-8 bg-primary hover:bg-blue-400 text-white font-semibold rounded-xl inline-flex items-center gap-2 active:scale-[0.97]"
        >
          <Plus size={18} />
          {t("cta.button")}
        </button>
      </div>
    </section>
  );
}
