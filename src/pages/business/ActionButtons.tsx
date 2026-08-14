import { Heart, Navigation, Phone, Share2 } from "lucide-react";
import type { Business } from "../../types";

interface ActionButtonsProps {
  business: Business;
}

export default function ActionButtons({ business }: ActionButtonsProps) {
  return (
    <div className="grid grid-cols-4 gap-3 mt-6">
      <a
        href={business.phone ? `tel:${business.phone}` : undefined}
        className="bg-primary text-white h-14 rounded-xl flex flex-col items-center justify-center gap-1"
      >
        <Phone size={18} />
        <span className="text-xs font-medium">Qo'ng'iroq</span>
      </a>

      <button className="bg-white/[0.05] border border-white/[0.10] text-ink h-14 rounded-xl flex flex-col items-center justify-center gap-1 hover:border-primary/30">
        <Navigation size={18} />
        <span className="text-xs font-medium">Yo'nalish</span>
      </button>

      <button className="bg-white/[0.05] border border-white/[0.10] text-ink h-14 rounded-xl flex flex-col items-center justify-center gap-1 hover:border-primary/30">
        <Share2 size={18} />
        <span className="text-xs font-medium">Ulashish</span>
      </button>

      <button className="bg-white/[0.05] border border-white/[0.10] text-ink h-14 rounded-xl flex flex-col items-center justify-center gap-1 hover:border-primary/30">
        <Heart size={18} />
        <span className="text-xs font-medium">Saqlash</span>
      </button>
    </div>
  );
}
