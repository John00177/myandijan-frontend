import { Plus, Trash2, UtensilsCrossed } from "lucide-react";
import { useEffect, useState } from "react";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import Skeleton from "../../components/ui/Skeleton";
import { useLanguage } from "../../contexts/LanguageContext";
import { ApiError, createMenuItem, deleteMenuItem, getBusinessMenu, uploadImage } from "../../lib/api";
import type { MenuItem } from "../../types";

interface MenuSectionProps {
  businessId: number;
  canManage: boolean;
}

function formatPrice(price: MenuItem["price"]): string {
  if (price == null) return "";
  return `${Number(price).toLocaleString("uz-UZ")} so'm`;
}

interface AddItemFormState {
  name: string;
  price: string;
  description: string;
}

const EMPTY_FORM: AddItemFormState = { name: "", price: "", description: "" };

function AddItemForm({ onAdd, error }: { onAdd: (form: AddItemFormState, photo: File | null) => Promise<void>; error: string | null }) {
  const { t } = useLanguage();
  const [form, setForm] = useState<AddItemFormState>(EMPTY_FORM);
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  // The preview URL is a blob: reference to the file, not the file itself —
  // must be revoked when it's replaced/unmounted or it leaks memory for the
  // life of the tab.
  useEffect(() => {
    if (!photo) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(photo);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  function update<K extends keyof AddItemFormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit() {
    if (!form.name.trim() || !form.price.trim()) return;
    setSubmitting(true);
    setUploading(!!photo);
    try {
      await onAdd(form, photo);
      setForm(EMPTY_FORM);
      setPhoto(null);
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  }

  return (
    <Card className="p-4 mb-4">
      <p className="text-sm font-medium text-ink mb-3">{t("addMenuItem")}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          placeholder={`${t("itemName")} *`}
          className="h-11 px-3 bg-elevated border border-white/[0.10] rounded-xl text-sm text-ink placeholder:text-ink-muted outline-none focus:border-primary/50"
        />
        <input
          value={form.price}
          onChange={(e) => update("price", e.target.value)}
          placeholder={`${t("itemPrice")} *`}
          type="number"
          min="0"
          className="h-11 px-3 bg-elevated border border-white/[0.10] rounded-xl text-sm text-ink placeholder:text-ink-muted outline-none focus:border-primary/50"
        />
      </div>
      <textarea
        value={form.description}
        onChange={(e) => update("description", e.target.value)}
        placeholder={t("description")}
        rows={2}
        className="w-full h-auto py-2.5 px-3 mt-2 bg-elevated border border-white/[0.10] rounded-xl text-sm text-ink placeholder:text-ink-muted outline-none focus:border-primary/50 resize-none"
      />

      <div className="mt-2 flex items-center gap-3">
        {previewUrl && (
          <img src={previewUrl} alt="" className="size-14 rounded-lg object-cover border border-white/[0.10]" />
        )}
        <label className="h-11 px-3 flex-1 flex items-center justify-center gap-2 bg-elevated border border-dashed border-white/[0.15] rounded-xl text-sm text-ink-muted cursor-pointer hover:border-primary/50">
          {photo ? photo.name : t("selectPhoto")}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      {error && <p className="text-xs text-danger mt-2">{error}</p>}
      <Button
        size="md"
        variant="primary"
        className="mt-3"
        disabled={submitting || !form.name.trim() || !form.price.trim()}
        onClick={submit}
      >
        <Plus size={16} />
        {uploading ? `${t("uploading")}...` : submitting ? `${t("adding")}...` : t("addMenuItem")}
      </Button>
    </Card>
  );
}

/**
 * Own component (not inline) so `errored` is scoped per-item — without that,
 * one broken image URL among several items would have no way to fall back
 * independently. Previously there was no onError handler at all here, so a
 * dead URL rendered the browser's raw broken-image icon instead of the
 * UtensilsCrossed placeholder every other empty-photo state in this app
 * already uses.
 */
function MenuItemPhoto({ url, name }: { url: string | null | undefined; name: string }) {
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    setErrored(false);
  }, [url]);

  if (!url || errored) {
    return (
      <div className="size-24 rounded-lg bg-elevated shrink-0 flex items-center justify-center">
        <UtensilsCrossed size={22} className="text-ink-muted/40" />
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={name}
      className="size-24 rounded-lg object-cover shrink-0 bg-elevated"
      onError={() => setErrored(true)}
    />
  );
}

export default function MenuSection({ businessId, canManage }: MenuSectionProps) {
  const { t } = useLanguage();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getBusinessMenu(businessId)
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch(() => {
        // Empty menu reads the same as a failed fetch here — either way
        // there's nothing to show, and the page shouldn't hard-fail over it.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [businessId]);

  async function handleAdd(form: AddItemFormState, photo: File | null) {
    setAddError(null);
    try {
      // Upload first, then create — the item can't reference a photo URL
      // that doesn't exist yet.
      const photoUrl = photo ? (await uploadImage(photo)).url : undefined;
      const created = await createMenuItem(businessId, {
        name: form.name.trim(),
        price: Number(form.price),
        description: form.description.trim() || undefined,
        photo: photoUrl,
      });
      setItems((prev) => [...prev, created]);
      setShowForm(false);
    } catch (err) {
      setAddError(err instanceof ApiError ? err.message : t("addItemError"));
      throw err;
    }
  }

  async function handleDelete(id: number) {
    setDeletingId(id);
    try {
      await deleteMenuItem(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch {
      // Leave the item in place — the delete button staying clickable is
      // feedback enough that nothing happened, no need for a toast here.
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {canManage && (
        <div className="mb-4">
          {showForm ? (
            <AddItemForm onAdd={handleAdd} error={addError} />
          ) : (
            <div className="flex justify-end">
              <Button size="sm" variant="ghost" onClick={() => setShowForm(true)}>
                <Plus size={16} /> {t("addMenuItem")}
              </Button>
            </div>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState icon={UtensilsCrossed} title={t("noMenuYet")} body={t("noMenuDescription")} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {items.map((item) => (
            <Card key={item.id} className="p-4 flex gap-4">
              <MenuItemPhoto url={item.imageUrl} name={item.name} />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-ink truncate">{item.name}</span>
                  {canManage && (
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                      aria-label={t("delete")}
                      className="text-ink-muted hover:text-danger shrink-0"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
                <div className="font-bold text-primary text-sm mt-0.5">{formatPrice(item.price)}</div>
                {item.description && <p className="text-xs text-ink-muted mt-1 line-clamp-2">{item.description}</p>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
