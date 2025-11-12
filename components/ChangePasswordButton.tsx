"use client";
import React, { useState } from "react";

export default function ChangePasswordButton() {
  const [open, setOpen] = useState(false);
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const res = await fetch("/api/admin/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pass }),
    });
    const data = await res.json();
    if (data.ok) setMsg("Password changed.");
    else setMsg(data.error || "Failed.");
    setPass("");
  }

  return (
    <div>
      <button onClick={() => setOpen(v=>!v)} style={{padding:"10px 14px", borderRadius:8, background:"#1f2937", color:"#fff", border:0, cursor:"pointer"}}>
        Change Password
      </button>
      {open && (
        <form onSubmit={submit} style={{display:"flex", gap:8, marginTop:8}}>
          <input value={pass} onChange={e=>setPass(e.target.value)} type="password" placeholder="New password"
                 style={{padding:"10px 12px", borderRadius:8, border:"1px solid #ccc"}} />
          <button type="submit" style={{padding:"10px 14px", borderRadius:8, background:"#2563eb", color:"#fff", border:0}}>Save</button>
        </form>
      )}
      {msg && <p style={{fontSize:12, color:"#065f46", marginTop:6}}>{msg}</p>}
    </div>
  );
}
