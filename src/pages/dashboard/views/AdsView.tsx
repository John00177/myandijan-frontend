import { Megaphone } from "lucide-react";
import EmptyState from "../../../components/ui/EmptyState";

export default function AdsView() {
  return (
    <EmptyState
      icon={Megaphone}
      title="Reklamalar tez orada"
      body="Biznesingizni reklama qilish imkoniyati tez orada qo'shiladi."
    />
  );
}
