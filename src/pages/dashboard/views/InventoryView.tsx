import { AlertTriangle, Package, Plus, ShoppingBag } from "lucide-react";
import { useState } from "react";
import Badge from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import KpiCard from "../KpiCard";
import { LOW_STOCK_THRESHOLD, MOCK_PRODUCTS, type Product } from "../mockData";
import ProductModal from "../ProductModal";
import ProductRow from "../ProductRow";

let nextId = MOCK_PRODUCTS.length + 1;

export default function InventoryView() {
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(null);

  const inStockCount = products.filter((p) => p.quantity > 0).length;
  const outOfStockCount = products.filter((p) => p.quantity === 0).length;
  const lowStock = products.filter((p) => p.quantity < LOW_STOCK_THRESHOLD);

  function openAddModal() {
    setEditingProduct(null);
    setModalOpen(true);
  }

  function openEditModal(product: Product) {
    setEditingProduct(product);
    setModalOpen(true);
  }

  // No POST/PUT /products endpoint exists yet — this only proves out the UI.
  function handleSave(form: {
    name: string;
    sku: string;
    category: string;
    price: string;
    quantity: string;
    description: string;
  }) {
    const price = Number(form.price) || 0;
    const quantity = Number(form.quantity) || 0;

    if (editingProduct) {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === editingProduct.id
            ? { ...p, name: form.name, sku: form.sku, category: form.category, price, quantity, description: form.description }
            : p,
        ),
      );
    } else {
      setProducts((prev) => [
        ...prev,
        {
          id: nextId++,
          name: form.name,
          sku: form.sku,
          category: form.category,
          price,
          quantity,
          description: form.description,
          imageUrl: null,
        },
      ]);
    }

    setModalOpen(false);
  }

  function handleConfirmDelete(id: number) {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setConfirmingDeleteId(null);
  }

  return (
    <div>
      <div className="mb-4 rounded-lg bg-elevated border border-white/[0.10] px-4 py-2.5 text-sm text-ink-muted">
        <span className="font-semibold text-ink-body">Demo rejimi.</span> Omborxona hali API bilan bog'lanmagan —
        bu yerdagi mahsulotlar faqat interfeysni ko'rsatish uchun va saqlanmaydi.
      </div>

      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-ink-muted">{products.length} ta mahsulot</p>
        <Button variant="primary" size="sm" onClick={openAddModal}>
          <Plus size={16} />
          Yangi mahsulot
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <KpiCard icon={Package} label="Jami mahsulotlar" value={products.length} trendTone="blue" />
        <KpiCard icon={ShoppingBag} label="Sotuvda" value={inStockCount} trendTone="success" />
        <KpiCard icon={AlertTriangle} label="Tugagan" value={outOfStockCount} trendTone="danger" />
      </div>

      <div className="flex flex-col gap-3">
        {products.map((product) => (
          <ProductRow
            key={product.id}
            product={product}
            confirmingDelete={confirmingDeleteId === product.id}
            onEdit={() => openEditModal(product)}
            onRequestDelete={() => setConfirmingDeleteId(product.id)}
            onConfirmDelete={() => handleConfirmDelete(product.id)}
            onCancelDelete={() => setConfirmingDeleteId(null)}
          />
        ))}
      </div>

      {lowStock.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-bold text-ink mb-4">Kam qolgan mahsulotlar</h2>
          <div className="flex flex-col gap-3">
            {lowStock.map((product) => (
              <div
                key={product.id}
                className="flex items-center gap-3 p-4 bg-danger/[0.05] border border-danger/20 rounded-xl"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-ink truncate">{product.name}</div>
                  <div className="text-xs text-ink-muted">Soni: {product.quantity}</div>
                </div>
                <Badge tone="danger">Kam qoldi</Badge>
                <Button variant="ghost" size="sm">
                  Buyurtma berish
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <ProductModal
        open={modalOpen}
        product={editingProduct}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
}
