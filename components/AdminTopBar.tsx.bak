import { cookies } from "next/headers";
import Link from "next/link";

export default async function AdminTopBar() {
  const c = await cookies();
  const isAuthed = c.get("ms_admin")?.value === "1";

  // Only show the buttons when the admin is authenticated.
  // When not authed, show nothing here (the gate is in page.tsx).
  if (!isAuthed) return null;

  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        justifyContent: "flex-end",
        margin: "12px 0 24px",
      }}
    >
      <Link
        href="/admin/password"
        style={{
          background: "#1a6f37",
          color: "#fff",
          padding: "10px 16px",
          borderRadius: 8,
          fontWeight: 700,
          textDecoration: "none",
        }}
      >
        Change Password
      </Link>

      <Link
        href="/"
        style={{
          background: "#2c3e50",
          color: "#fff",
          padding: "10px 16px",
          borderRadius: 8,
          fontWeight: 700,
          textDecoration: "none",
        }}
      >
        Back to site
      </Link>
    </div>
  );
}

