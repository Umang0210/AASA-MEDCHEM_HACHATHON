"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);
    if (res?.error) {
      setError("Invalid email or password. Please try again.");
    } else {
      // Will be redirected by middleware based on role
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">📦</div>
          <span className="login-logo-text">InventoryOS</span>
        </div>
        <p className="login-subtitle">Sign in to manage inventory and orders</p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="alert alert-error">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <button
            id="login-submit"
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading}
            style={{ width: "100%", marginTop: "var(--space-2)" }}
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <div className="divider" style={{ marginTop: "var(--space-8)" }} />

        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", textAlign: "center", lineHeight: 2 }}>
          <strong style={{ color: "var(--text-secondary)" }}>Test Credentials</strong><br />
          <span>Admin:</span> <code style={{ color: "var(--text-accent)" }}>admin@inventory.com</code> / <code style={{ color: "var(--text-accent)" }}>admin123</code><br />
          <span>Seller:</span> <code style={{ color: "var(--text-accent)" }}>priya@seller.com</code> / <code style={{ color: "var(--text-accent)" }}>seller123</code>
        </div>
      </div>
    </div>
  );
}
