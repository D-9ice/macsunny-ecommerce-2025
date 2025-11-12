import { z } from 'zod';

// Product validation
export const productSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  name: z.string().min(1, 'Product name is required'),
  category: z.string().min(1, 'Category is required'),
  price: z.number().positive('Price must be positive'),
  image: z.string().optional().default('/logo.svg'),
  stock: z.number().int().nonnegative('Stock cannot be negative').optional().default(0),
});

export const productUpdateSchema = productSchema.partial();

// Order item validation
export const orderItemSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  price: z.number().positive(),
  qty: z.number().int().positive('Quantity must be at least 1'),
});

// Order validation
export const orderSchema = z.object({
  items: z.array(orderItemSchema).min(1, 'Order must have at least one item'),
  customerName: z.string().min(2, 'Customer name is required'),
  customerEmail: z.string().email('Invalid email').optional(),
  customerPhone: z.string().min(10, 'Valid phone number is required'),
  customerAddress: z.string().optional(),
  total: z.number().positive('Total must be positive'),
});

// Admin login validation
export const adminLoginSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

// Admin password change validation
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

// Category validation
export const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
});

// Customer validation
export const customerSchema = z.object({
  name: z.string().min(2, 'Customer name is required'),
  email: z.string().email('Invalid email').optional(),
  phone: z.string().min(10, 'Valid phone number is required'),
  address: z.string().optional(),
});

// Search/filter validation
export const searchSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  minPrice: z.number().nonnegative().optional(),
  maxPrice: z.number().positive().optional(),
  limit: z.number().int().positive().max(100).optional().default(25),
  offset: z.number().int().nonnegative().optional().default(0),
});

// Type exports
export type Product = z.infer<typeof productSchema>;
export type ProductUpdate = z.infer<typeof productUpdateSchema>;
export type OrderItem = z.infer<typeof orderItemSchema>;
export type Order = z.infer<typeof orderSchema>;
export type AdminLogin = z.infer<typeof adminLoginSchema>;
export type ChangePassword = z.infer<typeof changePasswordSchema>;
export type Category = z.infer<typeof categorySchema>;
export type Customer = z.infer<typeof customerSchema>;
export type SearchParams = z.infer<typeof searchSchema>;
