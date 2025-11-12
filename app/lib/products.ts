export type Product = {
  sku: string;
  name: string;
  category: string;
  price: number;
  image: string;
};

export const products: Product[] = [
  { sku: 'ESP32-WROOM', name: 'ESP32-WROOM Module', category: 'WiFi/BT', price: 45.0, image: '/logo.svg' },
];

const ADMIN_KEY = 'ms_admin_products';
const CATEGORY_KEY = 'macsunny_categories';

export function allProducts(): Product[] {
  if (typeof window === 'undefined') {
    return products;
  }

  try {
    const raw = window.localStorage.getItem(ADMIN_KEY);
    const adminProducts: Product[] = raw ? (JSON.parse(raw) as Product[]) : [];
    if (adminProducts.length === 0) {
      return products;
    }

    const bySku = new Map<string, Product>();
    [...products, ...adminProducts].forEach(product => {
      bySku.set(product.sku, product);
    });
    return [...bySku.values()];
  } catch {
    return products;
  }
}

export function readAdmin(): Product[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(ADMIN_KEY);
    return raw ? (JSON.parse(raw) as Product[]) : [];
  } catch {
    return [];
  }
}

export function writeAdmin(list: Product[]) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(ADMIN_KEY, JSON.stringify(list));
}

export function readCategories(): string[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(CATEGORY_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function writeCategories(categories: string[]) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(CATEGORY_KEY, JSON.stringify(categories));
}
