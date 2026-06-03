"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

interface Props {
  user: { name?: string | null; email?: string | null; role?: string };
}

const NAV = [
  { href: "/seller/dashboard", icon: "🏠", label: "Dashboard" },
  { href: "/seller/products", icon: "🛒", label: "Browse Products" },
  { href: "/seller/cart", icon: "🛍️", label: "My Cart" },
  { href: "/seller/quotations", icon: "📋", label: "My Quotations" },
];

export default function SellerSidebar({ user }: Props) {
  const pathname = usePathname();
  const initials = (user.name ?? "S")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">📦</div>
        <div>
          <div className="sidebar-logo-text">InventoryOS</div>
          <div className="sidebar-logo-sub">Seller Portal</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Navigation</div>
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${pathname === item.href ? "active" : ""}`}
            id={`nav-${item.label.replace(/ /g, "-").toLowerCase()}`}
          >
            <span className="nav-item-icon">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-card">
          <div className="user-avatar">{initials}</div>
          <div className="user-info">
            <div className="user-name">{user.name}</div>
            <div className="user-role">
              <span className="badge badge-seller">seller</span>
            </div>
          </div>
        </div>
        <button
          id="seller-signout-btn"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="btn btn-secondary"
          style={{ width: "100%", marginTop: "var(--space-3)" }}
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}
