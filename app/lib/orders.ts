export type OrderItem = {
  sku: string;
  name: string;
  price: number;
  qty: number;
};

export type Order = {
  _id?: string; // MongoDB ObjectId as string (optional)
  orderId: string; // Your readable unique order ID
  items: OrderItem[];
  total: number;
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  customerAddress?: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt?: string;
};

const ORDERS_KEY = 'ms_orders';

export function getAllOrders(): Order[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveOrder(order: Order): void {
  if (typeof window === 'undefined') return;
  try {
    const orders = getAllOrders();
    orders.unshift(order);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  } catch (error) {
    console.error('Failed to save order:', error);
  }
}

export function updateOrderStatus(orderId: string, status: Order['status']): void {
  if (typeof window === 'undefined') return;
  try {
    const orders = getAllOrders();
    const index = orders.findIndex(o => o.orderId === orderId);
    if (index !== -1) {
      orders[index].status = status;
      localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    }
  } catch (error) {
    console.error('Failed to update order status:', error);
  }
}

export function generateOrderId(): string {
  return 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
}