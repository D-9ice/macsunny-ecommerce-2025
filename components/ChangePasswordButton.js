"use client";
import React, { useState } from "react";

export default function ChangePasswordButton() {
  const [showForm, setShowForm] = useState(false);
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    try {
      const res = await fetch("/api/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPass, newPass }),
      });
      const data = await res.json();
      setMessage(data.message || "Password updated successfully!");
    } catch {
      setMessage("Error updating password.");
    }
  };

  return (
    <div style={{ marginTop: "1rem", textAlign: "center" }}>
      <button
        style={{
          background: "#006400",
          color: "white",
          border: "none",
          padding: "8px 16px",
          borderRadius: "6px",
          cursor: "pointer",
        }}
        onClick={() => setShowForm(!showForm)}
      >
        {showForm ? "Cancel" : "Change Password"}
      </button>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          style={{
            marginTop: "1rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <input
            type="password"
            placeholder="Old Password"
            value={oldPass}
            onChange={(e) => setOldPass(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="New Password"
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            required
          />
          <button
            type="submit"
            style={{
              background: "#006400",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Save
          </button>
          <p style={{ color: "#fff" }}>{message}</p>
        </form>
      )}
    </div>
  );
}
