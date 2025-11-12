'use client';

export type AdminProduct = {
  sku: string;
  name: string;
  category: string;
  price: number;
  image?: string;
  description?: string;
  qty?: number;
};

const KEY = 'ms_admin_products_v1';

export function loadAdminProducts(): AdminProduct[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AdminProduct[]) : [];
  } catch {
    return [];
  }
}

export function saveAdminProducts(items: AdminProduct[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function upsertProduct(p: AdminProduct) {
  const items = loadAdminProducts();
  const i = items.findIndex(x => x.sku === p.sku);
  if (i >= 0) items[i] = p;
  else items.unshift(p);
  saveAdminProducts(items);
}

export function removeProduct(sku: string) {
  saveAdminProducts(loadAdminProducts().filter(x => x.sku !== sku));
}
