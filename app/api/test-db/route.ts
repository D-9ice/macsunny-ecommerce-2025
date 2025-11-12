import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";

export async function GET() {
  try {
    await connectDB();
    return NextResponse.json({ status: "connected", message: "✅ MongoDB Connected Successfully" });
  } catch (err: any) {
    return NextResponse.json({ status: "error", message: err.message }, { status: 500 });
  }
}
