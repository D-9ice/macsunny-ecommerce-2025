"use client";
import React, { useEffect, useState } from "react";

type Product = {
  _id?: string;
  sku: string;
  name: string;
  category?: string;
  imageUrl?: string;
  description?: string;
  quantity?: number;
  price?: number;
};

const box: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #ccc",
  borderRadius: 12,
  padding: 16,
  minHeight: 280,
};

const label: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  marginTop: 10,
  marginBottom: 4,
  color: "#111",
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #bbb",
  outline: "none",
  fontSize: 14,
  background: "#fff",
  color: "#111",
};

const textarea: React.CSSProperties = {
  ...input,
  minHeight: 80,
  resize: "vertical",
};

const row: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 20,
};

const btn: React.CSSProperties = {
  display: "inline-block",
  marginTop: 12,
  padding: "10px 14px",
  borderRadius: 8,
  border: "1px solid #0a6d2c",
  background: "#11823b",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};

const listItem: React.CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 8,
  padding: 10,
};

export default function AdminInventory() {
  const [form, setForm] = useState<Product>({
    sku: "",
    name: "",
    category: "",
    imageUrl: "",
    description: "",
    quantity: 0,
    price: 0,
  });
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Product[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const onChange =
    (key: keyof Product) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const v =
        key === "quantity" || key === "price"
          ? Number(e.target.value || 0)
          : e.target.value;
      setForm((f) => ({ ...f, [key]: v }));
    };

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      // Map form fields to API expected format
      const payload = {
        sku: form.sku,
        name: form.name,
        category: form.category,
        price: form.price,
        image: form.imageUrl || '/logo.svg',
        description: form.description,
        quantity: form.quantity,
      };
      
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Save failed");
      setMsg("Saved ✅");
      setForm({ sku: "", name: "", category: "", imageUrl: "", description: "", quantity: 0, price: 0 });
      await search();
    } catch (err: any) {
      setMsg("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function search() {
    const res = await fetch(`/api/products?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setItems(data?.items || []);
  }

  useEffect(() => {
    search();
  }, []);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 16px 32px" }}>
      <div style={row}>
        {/* Left: form */}
        <div style={box}>
          <div>
            <div style={label}>SKU *</div>
            <input style={input} value={form.sku} onChange={onChange("sku")} placeholder="e.g. 74HC595" />
            <div style={label}>Name *</div>
            <input style={input} value={form.name} onChange={onChange("name")} placeholder="Shift Register 8-bit" />
            <div style={label}>Category</div>
            <input style={input} value={form.category || ""} onChange={onChange("category")} placeholder="ICs" />
            <div style={label}>Image URL</div>
            <input style={input} value={form.imageUrl || ""} onChange={onChange("imageUrl")} placeholder="https://..." />
            <div style={label}>Description</div>
            <textarea style={textarea} value={form.description || ""} onChange={onChange("description")} placeholder="Short details..." />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div style={label}>Quantity</div>
                <input type="number" style={input} value={form.quantity ?? 0} onChange={onChange("quantity")} />
              </div>
              <div>
                <div style={label}>Price</div>
                <input type="number" style={input} value={form.price ?? 0} onChange={onChange("price")} />
              </div>
            </div>
            <button style={btn} onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
            {msg && <div style={{ marginTop: 8, color: "#0a0" }}>{msg}</div>}
          </div>
        </div>

        {/* Right: search & list */}
        <div style={box}>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              style={{ ...input, flex: 1 }}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search inventory"
            />
            <button style={{ ...btn, marginTop: 0 }} onClick={search}>Search</button>
          </div>
          <div style={{ marginTop: 12, maxHeight: 420, overflow: "auto", paddingRight: 4 }}>
            {items.length === 0 && <div style={{ color: "#333" }}>No items yet.</div>}
            {items.map((p) => (
              <div key={p._id || p.sku} style={listItem}>
                <div style={{ fontWeight: 700 }}>{p.name} <span style={{ opacity: 0.7 }}>({p.sku})</span></div>
                <div style={{ fontSize: 13, opacity: 0.8 }}>
                  {p.category} · qty: {p.quantity ?? 0} · GHS {p.price ?? 0}
                </div>
                {p.imageUrl && <div style={{ fontSize: 12, opacity: 0.7, wordBreak: "break-all" }}>{p.imageUrl}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
