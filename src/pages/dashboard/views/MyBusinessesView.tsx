import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Badge from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import { useLanguage } from "../../../contexts/LanguageContext";
import { MOCK_BUSINESSES } from "../mockData";

export default function MyBusinessesView() {
  const { lang } = useLanguage();
  const navigate = useNavigate();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-ink-muted">{MOCK_BUSINESSES.length} ta biznes</p>
        <Button variant="primary" size="sm" onClick={() => navigate(`/${lang}/dashboard/business/new`)}>
          <Plus size={16} />
          Yangi biznes qo'shish
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {MOCK_BUSINESSES.map((business) => (
          <div key={business.id} className="bg-card border border-white/[0.08] rounded-xl overflow-hidden">
            <div className="aspect-[16/10] w-full bg-gradient-to-br from-[#1F2C38] to-[#121A22]" />
            <div className="p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-ink truncate">{business.name}</span>
                <Badge tone={business.status === "approved" ? "success" : "amber"}>
                  {business.status === "approved" ? "Tasdiqlangan" : "Kutilmoqda"}
                </Badge>
              </div>
              <div className="text-xs text-ink-muted mt-1">{business.category}</div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-3"
                onClick={() => navigate(`/${lang}/dashboard/business/${business.id}/edit`)}
              >
                Tahrirlash
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
