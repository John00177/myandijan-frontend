export interface PresetAvatar {
  id: string;
  emoji: string;
  bg: string;
  label: string;
}

export const MALE_AVATARS: PresetAvatar[] = [
  { id: "m1", emoji: "👨‍💼", bg: "#3B82F6", label: "Biznesmen" },
  { id: "m2", emoji: "👨‍⚕️", bg: "#10B981", label: "Shifokor" },
  { id: "m3", emoji: "👨‍🍳", bg: "#F59E0B", label: "Oshpaz" },
  { id: "m4", emoji: "👨‍🏫", bg: "#8B5CF6", label: "O'qituvchi" },
];

export const FEMALE_AVATARS: PresetAvatar[] = [
  { id: "f1", emoji: "👩‍💼", bg: "#EC4899", label: "Biznesmen" },
  { id: "f2", emoji: "👩‍⚕️", bg: "#06B6D4", label: "Shifokor" },
  { id: "f3", emoji: "👩‍🍳", bg: "#84CC16", label: "Oshpaz" },
  { id: "f4", emoji: "👩‍🏫", bg: "#EF4444", label: "O'qituvchi" },
];

export const PRESET_AVATARS: PresetAvatar[] = [...MALE_AVATARS, ...FEMALE_AVATARS];

export function findPresetAvatar(avatarId: string | null | undefined): PresetAvatar | undefined {
  return PRESET_AVATARS.find((a) => a.id === avatarId);
}

interface AvatarRowProps {
  avatars: PresetAvatar[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function AvatarRow({ avatars, selectedId, onSelect }: AvatarRowProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {avatars.map(({ id, emoji, bg, label }) => {
        const selected = id === selectedId;
        return (
          <button
            key={id}
            type="button"
            aria-label={label}
            aria-pressed={selected}
            onClick={() => onSelect(id)}
            className={`size-12 rounded-full flex items-center justify-center text-2xl leading-none transition-all ${
              selected ? "ring-2 ring-white ring-offset-2 ring-offset-base scale-110" : ""
            }`}
            style={{ backgroundColor: bg }}
          >
            {emoji}
          </button>
        );
      })}
    </div>
  );
}

interface AvatarPickerProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function AvatarPicker({ selectedId, onSelect }: AvatarPickerProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-ink-muted">Erkak</span>
        <AvatarRow avatars={MALE_AVATARS} selectedId={selectedId} onSelect={onSelect} />
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-ink-muted">Ayol</span>
        <AvatarRow avatars={FEMALE_AVATARS} selectedId={selectedId} onSelect={onSelect} />
      </div>
    </div>
  );
}
