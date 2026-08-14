import { Eye, MessageSquare, Phone, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Badge from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import { useLanguage } from "../../../contexts/LanguageContext";
import KpiCard from "../KpiCard";
import { MOCK_ACTIVITY, MOCK_BUSINESSES } from "../mockData";
import type { DashboardView } from "../types";

interface DashboardHomeViewProps {
  onSelectView: (view: DashboardView) => void;
}

export default function DashboardHomeView({ onSelectView }: DashboardHomeViewProps) {
  const { lang } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Eye} label="Ko'rishlar" value="—" trend="+12%" trendTone="blue" />
        <KpiCard icon={Phone} label="Qo'ng'iroqlar" value="—" trend="+5%" trendTone="success" />
        <KpiCard icon={MessageSquare} label="Sharhlar" value="—" trend="-2%" trendTone="danger" />
        <KpiCard icon={Star} label="Reyting" value="4.5" trend="Barqaror" trendTone="amber" />
      </div>

      <div>
        <h2 className="text-lg font-bold text-ink mb-4">So'nggi faoliyat</h2>
        <div className="flex flex-col gap-2">
          {MOCK_ACTIVITY.map((activity) => (
            <div key={activity.id} className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-lg">
              <span className="size-2 rounded-full bg-primary shrink-0" />
              <span className="text-sm text-ink-body">{activity.text}</span>
              <span className="text-xs text-ink-muted ml-auto shrink-0">{activity.timeAgo}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-ink">Mening bizneslarim</h2>
          <button
            onClick={() => onSelectView("businesses")}
            className="text-sm text-primary hover:text-blue-300 transition-colors"
          >
            Barchasi →
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {MOCK_BUSINESSES.slice(0, 3).map((business) => (
            <div key={business.id} className="flex items-center gap-4 p-4 bg-card border border-white/[0.08] rounded-xl">
              <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-[#1F2C38] to-[#121A22] shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-ink truncate">{business.name}</div>
                <Badge tone={business.status === "approved" ? "success" : "amber"} className="mt-1">
                  {business.status === "approved" ? "Tasdiqlangan" : "Kutilmoqda"}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/${lang}/dashboard/business/${business.id}/edit`)}
              >
                Tahrirlash
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
