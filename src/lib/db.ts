import mongoose from "mongoose";

let isConnected = false;

/**
 * Connect to MongoDB Atlas using the exact URI from .env.local
 * No localhost fallback (prevents ECONNREFUSED & invalid scheme errors).
 */
export async function connectDB() {
  if (isConnected && mongoose.connection.readyState === 1) return;

  const uri = process.env.MONGODB_URI;
  if (!uri || !uri.startsWith("mongodb")) {
    throw new Error("MONGODB_URI missing or invalid. Set a valid Atlas URI in .env.local");
  }

  // Avoid multiple connections in dev hot reload
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri, { dbName: process.env.MONGODB_DB || "macsunny" });
  }

  isConnected = mongoose.connection.readyState === 1;
}
export default connectDB;
