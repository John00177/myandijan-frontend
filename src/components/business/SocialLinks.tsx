// lucide-react dropped brand-specific icons (Instagram included) — Camera is
// the closest generic stand-in available in this version.
import { Camera, Globe, Send } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";

interface SocialLinksProps {
  instagram?: string | null;
  telegram?: string | null;
  website?: string | null;
}

function withProtocol(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

/** Accepts a handle ("@name" / "name"), a bare domain, or a full URL — owners paste whatever they have. */
function instagramUrl(value: string): string {
  if (/^https?:\/\//i.test(value)) return value;
  return `https://instagram.com/${value.replace(/^@/, "")}`;
}

function telegramUrl(value: string): string {
  if (/^https?:\/\//i.test(value)) return value;
  return `https://t.me/${value.replace(/^@/, "")}`;
}

export default function SocialLinks({ instagram, telegram, website }: SocialLinksProps) {
  const { t } = useLanguage();
  const links = [
    instagram?.trim()
      ? { href: instagramUrl(instagram.trim()), label: "Instagram", Icon: Camera, className: "bg-[#E1306C] hover:bg-[#c8285f]" }
      : null,
    telegram?.trim()
      ? { href: telegramUrl(telegram.trim()), label: "Telegram", Icon: Send, className: "bg-[#26A5E4] hover:bg-[#2299d1]" }
      : null,
    website?.trim()
      ? { href: withProtocol(website.trim()), label: t("website"), Icon: Globe, className: "bg-white/[0.10] hover:bg-white/[0.15]" }
      : null,
  ].filter((link): link is NonNullable<typeof link> => link !== null);

  if (links.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      {links.map(({ href, label, Icon, className }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          title={label}
          className={`size-10 rounded-full text-white flex items-center justify-center transition-colors ${className}`}
        >
          <Icon size={18} />
        </a>
      ))}
    </div>
  );
}
