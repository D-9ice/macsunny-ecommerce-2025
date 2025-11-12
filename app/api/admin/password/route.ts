import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/src/lib/db";
import Admin from "@/src/models/Admin";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const c = await cookies();
    if ((await c).get("ms_admin")?.value !== "1") {
      return NextResponse.json({ ok:false, error:"Unauthorized" }, { status:401 });
    }

    await connectDB();
    const { password } = await req.json();
    if (!password || password.length < 6) {
      return NextResponse.json({ ok:false, error:"Password must be at least 6 characters" }, { status:400 });
    }

    const admin = await Admin.findOne({ email: process.env.ADMIN_EMAIL || "Macsunny2025@gmail.com" });
    if (!admin) return NextResponse.json({ ok:false, error:"Admin user not found" }, { status:404 });

    admin.passwordHash = await bcrypt.hash(password, 12);
    await admin.save();

    return NextResponse.json({ ok:true });
  } catch (e) {
    return NextResponse.json({ ok:false, error:(e as Error).message }, { status:500 });
  }
}
