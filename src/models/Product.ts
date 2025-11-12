import mongoose, { Schema, models } from "mongoose";

const ProductSchema = new Schema({
  sku: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  priceCents: { type: Number, default: 0 },
  imageUrl: { type: String },
  category: { type: String },
  description: { type: String },
}, { timestamps: true });

const Product = models.Product || mongoose.model("Product", ProductSchema);
export default Product;
