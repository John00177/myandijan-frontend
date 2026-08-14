import { useState } from "react";
import Button from "../../../components/ui/Button";

const DAYS = ["Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba", "Yakshanba"];

interface DayHours {
  open: string;
  close: string;
  isDayOff: boolean;
}

const inputClasses =
  "h-12 bg-elevated border border-white/[0.10] rounded-xl px-4 text-ink placeholder:text-ink-muted outline-none focus:border-primary/50";

export default function SettingsView() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [instagram, setInstagram] = useState("");
  const [telegram, setTelegram] = useState("");
  const [facebook, setFacebook] = useState("");
  const [hours, setHours] = useState<DayHours[]>(
    DAYS.map((_, i) => ({ open: "09:00", close: "18:00", isDayOff: i === 6 })),
  );
  const [justSaved, setJustSaved] = useState(false);

  function updateHours(index: number, patch: Partial<DayHours>) {
    setHours((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  }

  // There is no PUT /businesses/:id endpoint yet — this only proves out the UI.
  function handleSave() {
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  }

  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      <section>
        <h2 className="text-lg font-bold text-ink mb-4">Biznes ma'lumotlari</h2>
        <div className="flex flex-col gap-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Biznes nomi"
            className={inputClasses}
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tavsif"
            rows={3}
            className="bg-elevated border border-white/[0.10] rounded-xl px-4 py-3 text-ink placeholder:text-ink-muted outline-none focus:border-primary/50"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+998901234567"
            type="tel"
            className={inputClasses}
          />
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Manzil"
            className={inputClasses}
          />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold text-ink mb-4">Ish vaqti</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-muted text-xs uppercase tracking-wider">
                <th className="py-2 pr-3 font-medium">Hafta kuni</th>
                <th className="py-2 pr-3 font-medium">Ochish</th>
                <th className="py-2 pr-3 font-medium">Yopish</th>
                <th className="py-2 font-medium">Dam olish</th>
              </tr>
            </thead>
            <tbody>
              {DAYS.map((day, i) => (
                <tr key={day} className="border-t border-white/[0.06]">
                  <td className="py-2 pr-3 text-ink-body">{day}</td>
                  <td className="py-2 pr-3">
                    <input
                      type="time"
                      value={hours[i].open}
                      disabled={hours[i].isDayOff}
                      onChange={(e) => updateHours(i, { open: e.target.value })}
                      className="h-9 bg-elevated border border-white/[0.10] rounded-lg px-2 text-ink text-sm outline-none disabled:opacity-40 focus:border-primary/50"
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      type="time"
                      value={hours[i].close}
                      disabled={hours[i].isDayOff}
                      onChange={(e) => updateHours(i, { close: e.target.value })}
                      className="h-9 bg-elevated border border-white/[0.10] rounded-lg px-2 text-ink text-sm outline-none disabled:opacity-40 focus:border-primary/50"
                    />
                  </td>
                  <td className="py-2">
                    <input
                      type="checkbox"
                      checked={hours[i].isDayOff}
                      onChange={(e) => updateHours(i, { isDayOff: e.target.checked })}
                      className="size-4 accent-primary"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold text-ink mb-4">Ijtimoiy tarmoqlar</h2>
        <div className="flex flex-col gap-4">
          <input
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            placeholder="Instagram"
            className={inputClasses}
          />
          <input
            value={telegram}
            onChange={(e) => setTelegram(e.target.value)}
            placeholder="Telegram"
            className={inputClasses}
          />
          <input
            value={facebook}
            onChange={(e) => setFacebook(e.target.value)}
            placeholder="Facebook"
            className={inputClasses}
          />
        </div>
      </section>

      <Button variant="primary" size="lg" className="w-full" onClick={handleSave}>
        {justSaved ? "Saqlandi ✓" : "Saqlash"}
      </Button>
    </div>
  );
}
