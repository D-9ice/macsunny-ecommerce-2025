// app/lib/cart.ts

export type CartItem = {
  sku: string;
  name: string;
  price: number;
  qty: number;
  image?: string;
};

type CartItemInput = Omit<CartItem, 'qty'> & { qty?: number };

const CART_KEY = 'ms_cart_v1';

export function getCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(CART_KEY);
    if (data) {
      return JSON.parse(data);
    }

    const legacy = localStorage.getItem('macsunny_cart');
    if (legacy) {
      const parsed = JSON.parse(legacy);
      localStorage.setItem(CART_KEY, legacy);
      localStorage.removeItem('macsunny_cart');
      return parsed;
    }

    return [];
  } catch {
    return [];
  }
}

export function cartTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.qty, 0);
}

export function clearCart() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CART_KEY);
  localStorage.removeItem('macsunny_cart');
}

export function setCart(items: CartItem[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  localStorage.removeItem('macsunny_cart');
}

export function addToCart(item: CartItemInput): CartItem[] {
  const cart = getCart();
  const index = cart.findIndex((cartItem) => cartItem.sku === item.sku);
  const qty = item.qty ?? 1;

  if (index >= 0) {
    cart[index].qty += qty;
  } else {
    cart.push({ ...item, qty });
  }

  setCart(cart);
  return cart;
}

export function setQty(sku: string, qty: number): CartItem[] {
  const cart = getCart();
  const index = cart.findIndex((item) => item.sku === sku);

  if (index >= 0) {
    cart[index].qty = Math.max(0, qty);
    if (cart[index].qty === 0) {
      cart.splice(index, 1);
    }
    setCart(cart);
  }

  return cart;
}

export function removeFromCart(sku: string): CartItem[] {
  const filtered = getCart().filter((item) => item.sku !== sku);
  setCart(filtered);
  return filtered;
}
