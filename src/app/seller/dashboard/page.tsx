import { auth } from "@/lib/auth";
import { db } from "@/db";
import { quotations, orders } from "@/db/schema";
import { eq, count, and, inArray } from "drizzle-orm";
import { formatINR } from "@/lib/formatters";
import Link from "next/link";

export default async function SellerDashboard() {
  const session = await auth();
  const userId = session!.user.id;

  const [myQuotationsCount] = await db
    .select({ count: count() })
    .from(quotations)
    .where(eq(quotations.sellerId, userId));

  const [pendingCount] = await db
    .select({ count: count() })
    .from(quotations)
    .where(
      and(
        eq(quotations.sellerId, userId),
        eq(quotations.status, "submitted")
      )
    );

  const myOrdersData = await db.query.orders.findMany({
    where: eq(orders.sellerId, userId),
    with: {
      quotation: { with: { seller: true } },
    },
    orderBy: (o, { desc }) => [desc(o.createdAt)],
    limit: 5,
  });

  const kpis = [
    { icon: "📋", label: "Total Quotations", value: myQuotationsCount.count, color: "#6366f1", href: "/seller/quotations" },
    { icon: "⏳", label: "Awaiting Approval", value: pendingCount.count, color: "#f59e0b", href: "/seller/quotations" },
    { icon: "🚚", label: "Active Orders", value: myOrdersData.filter(o => o.status === "processing" || o.status === "shipped").length, color: "#10b981", href: "/seller/quotations" },
  ];

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Welcome back, {session!.user.name?.split(" ")[0]} 👋</h1>
          <p className="page-subtitle">Browse products and manage your quotations</p>
        </div>
        <Link href="/seller/products" className="btn btn-primary">
          🛒 Browse Products
        </Link>
      </div>

      <div className="kpi-grid">
        {kpis.map((kpi) => (
          <Link
            key={kpi.label}
            href={kpi.href}
            className="kpi-card"
            style={{ "--kpi-color": kpi.color } as React.CSSProperties}
          >
            <div className="kpi-icon" style={{ background: `${kpi.color}1a` }}>
              {kpi.icon}
            </div>
            <div className="kpi-value">{kpi.value}</div>
            <div className="kpi-label">{kpi.label}</div>
          </Link>
        ))}
      </div>

      {myOrdersData.length > 0 && (
        <div className="card" style={{ marginTop: "var(--space-8)" }}>
          <div className="flex justify-between items-center" style={{ marginBottom: "var(--space-5)" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>Recent Orders</h2>
            <Link href="/seller/quotations" className="btn btn-secondary btn-sm">
              View All →
            </Link>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {myOrdersData.map((o) => (
                  <tr key={o.id}>
                    <td className="mono">{o.id.slice(0, 8)}…</td>
                    <td style={{ fontWeight: 700 }}>{formatINR(parseFloat(o.totalAmount))}</td>
                    <td>
                      <span className={`badge badge-${o.status === "delivered" ? "green" : o.status === "cancelled" ? "red" : "blue"}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="muted text-sm">
                      {o.createdAt ? new Date(o.createdAt).toLocaleDateString("en-IN") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {myOrdersData.length === 0 && (
        <div className="card" style={{ marginTop: "var(--space-8)" }}>
          <div className="empty-state">
            <div className="empty-state-icon">🛒</div>
            <div className="empty-state-title">No orders yet</div>
            <p className="empty-state-description">
              Start by browsing our product catalogue and placing your first quotation.
            </p>
            <Link href="/seller/products" className="btn btn-primary" style={{ marginTop: "var(--space-4)" }}>
              Browse Products →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
