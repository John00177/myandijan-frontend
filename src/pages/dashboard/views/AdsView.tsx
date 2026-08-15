import { Megaphone } from "lucide-react";
import EmptyState from "../../../components/ui/EmptyState";

export default function AdsView() {
  return (
    <EmptyState
      icon={Megaphone}
      title="Reklamalar hali mavjud emas"
      body="Biznesingizni reklama qilish imkoniyati hozircha ishlab chiqilmoqda."
    />
  );
}
