import { Wrench } from "lucide-react";
import { useNavigate } from "react-router-dom";
import EmptyState from "../components/ui/EmptyState";
import { useLanguage } from "../contexts/LanguageContext";

export default function DashboardBusinessEditPage() {
  const { lang } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-base flex items-center justify-center px-6">
      <EmptyState
        icon={Wrench}
        title="Tahrirlash hali mavjud emas"
        body="Biznesni tahrirlash funksiyasi hozircha ishlab chiqilmoqda."
        actionLabel="Bizneslarimga qaytish"
        onAction={() => navigate(`/${lang}/dashboard`, { state: { view: "businesses" } })}
      />
    </div>
  );
}
