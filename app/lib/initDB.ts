import mongoose from "mongoose";
import { connectDB } from "./mongodb";

/**
 * Global flag to prevent multiple DB initializations during dev HMR
 */
declare global {
  // eslint-disable-next-line no-var
  var __mongoMonitorActive: boolean | undefined;
}

// Ensure Mongoose runs safely under strict mode
mongoose.set("strictQuery", false);

/**
 * Initializes MongoDB connection and sets up health monitoring.
 * Safe to import directly in `app/layout.tsx` or `middleware.ts`.
 */
export async function initDB(): Promise<void> {
  if (globalThis.__mongoMonitorActive) return;

  try {
    console.log("⏳ Connecting to MongoDB...");
    await connectDB();
    console.log("✅ MongoDB Initialized Automatically at Startup");

    const db = mongoose.connection;

    const hasListeners = (event: string) => db.listeners(event).length > 0;

    if (!hasListeners("connected")) {
      db.on("connected", () => {
        if (process.env.NODE_ENV !== "production") {
          console.log("🟢 MongoDB Connection Healthy");
        }
      });
    }

    if (!hasListeners("disconnected")) {
      db.on("disconnected", () => {
        console.warn("🟠 MongoDB Disconnected. Retrying...");
        const maxRetries = 5;
        let attempt = 0;

        const tryReconnect = async (): Promise<void> => {
          attempt++;
          try {
            await connectDB();
            console.log("🟢 MongoDB Reconnected Successfully");
          } catch (err) {
            console.error(`🔴 MongoDB Reconnection Failed (Attempt ${attempt}):`, err);
            if (attempt < maxRetries) {
              const delay = Math.min(1000 * 2 ** attempt, 30000);
              console.log(`⏳ Retrying in ${delay}ms...`);
              await new Promise((res) => setTimeout(res, delay));
              await tryReconnect();
            } else {
              console.error("❌ Max MongoDB reconnection attempts reached. Manual intervention required.");
            }
          }
        };

        // Fire reconnect in background
        void (async () => {
          try {
            await tryReconnect();
          } catch (err) {
            console.error("⚠️ Reconnection routine failed:", err);
          }
        })();
      });
    }

    if (!hasListeners("error")) {
      db.on("error", (err: unknown) => {
        console.error("🔴 MongoDB Error:", err);
      });
    }

    globalThis.__mongoMonitorActive = true;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("❌ MongoDB Auto-Connection Failed:", message);
  }
}

/**
 * Auto-run initializer only once on module import.
 */
if (!globalThis.__mongoMonitorActive) {
  void (async () => {
    try {
      await initDB();
    } catch (err) {
      console.error("❌ MongoDB initDB() auto-run failed:", err);
    }
  })();
}
