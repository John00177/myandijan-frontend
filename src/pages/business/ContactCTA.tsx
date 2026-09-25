import { MessageCircle, Phone } from "lucide-react";
import Button from "../../components/ui/Button";
import { useLanguage } from "../../contexts/LanguageContext";
import type { Business } from "../../types";

interface ContactCTAProps {
  business: Business;
}

/** WhatsApp's wa.me links need bare digits — no +, spaces, or dashes. */
function toWhatsAppDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

export default function ContactCTA({ business }: ContactCTAProps) {
  const { t } = useLanguage();
  const phone = business.phone ?? business.primaryBranch?.phone ?? business.branches?.[0]?.phone ?? null;
  if (!phone) return null;

  return (
    <div className="flex flex-col sm:flex-row gap-3 mt-6">
      <a href={`tel:${phone}`} className="flex-1">
        <Button variant="primary" size="lg" className="w-full">
          <Phone size={18} />
          {t("call")}
        </Button>
      </a>
      <a href={`https://wa.me/${toWhatsAppDigits(phone)}`} target="_blank" rel="noopener noreferrer" className="flex-1">
        <Button variant="secondary" size="lg" className="w-full bg-[#25D366]/10 border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366]/20">
          <MessageCircle size={18} />
          WhatsApp
        </Button>
      </a>
    </div>
  );
}
