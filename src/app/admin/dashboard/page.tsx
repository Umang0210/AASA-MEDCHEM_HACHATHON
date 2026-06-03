import { db } from "@/db";
import { products, quotations, orders, users } from "@/db/schema";
import { eq, count, sum } from "drizzle-orm";
import { formatINR } from "@/lib/formatters";
import Link from "next/link";

export default async function AdminDashboard() {
  // KPI queries
  const [productCount] = await db
    .select({ count: count() })
    .from(products)
    .where(eq(products.isActive, true));

  const [pendingQuotationsCount] = await db
    .select({ count: count() })
    .from(quotations)
    .where(eq(quotations.status, "submitted"));

  const [totalOrdersCount] = await db
    .select({ count: count() })
    .from(orders);

  const [sellerCount] = await db
    .select({ count: count() })
    .from(users)
    .where(eq(users.role, "seller"));

  const revenueResult = await db
    .select({ total: sum(orders.totalAmount) })
    .from(orders)
    .where(eq(orders.status, "delivered"));

  const revenue = parseFloat(revenueResult[0]?.total ?? "0");

  // Recent quotations
  const recentQuotations = await db.query.quotations.findMany({
    with: { seller: true },
    orderBy: (q, { desc }) => [desc(q.createdAt)],
    limit: 5,
  });

  const kpis = [
    {
      icon: "📦",
      label: "Active Products",
      value: productCount.count,
      color: "#6366f1",
      href: "/admin/products",
    },
    {
      icon: "📋",
      label: "Pending Quotations",
      value: pendingQuotationsCount.count,
      color: "#f59e0b",
      href: "/admin/quotations",
    },
    {
      icon: "🚚",
      label: "Total Orders",
      value: totalOrdersCount.count,
      color: "#10b981",
      href: "/admin/orders",
    },
    {
      icon: "👥",
      label: "Active Sellers",
      value: sellerCount.count,
      color: "#8b5cf6",
      href: "#",
    },
    {
      icon: "₹",
      label: "Total Revenue",
      value: formatINR(revenue),
      color: "#10b981",
      href: "/admin/orders",
    },
  ];

  const statusColors: Record<string, string> = {
    draft: "badge-gray",
    submitted: "badge-yellow",
    approved: "badge-green",
    rejected: "badge-red",
    fulfilled: "badge-purple",
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Overview of your inventory and order activity
          </p>
        </div>
        <Link href="/admin/products/new" className="btn btn-primary">
          + New Product
        </Link>
      </div>

      {/* KPI Cards */}
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

      {/* Recent Quotations */}
      <div className="card" style={{ marginTop: "var(--space-8)" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "var(--space-5)",
          }}
        >
          <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>
            Recent Quotations
          </h2>
          <Link
            href="/admin/quotations"
            className="btn btn-secondary btn-sm"
          >
            View All →
          </Link>
        </div>

        {recentQuotations.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-title">No quotations yet</div>
            <p className="empty-state-description">
              Quotations submitted by sellers will appear here.
            </p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Quotation ID</th>
                  <th>Seller</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {recentQuotations.map((q) => (
                  <tr key={q.id}>
                    <td className="mono">{q.id.slice(0, 8)}…</td>
                    <td>{q.seller.name}</td>
                    <td style={{ fontWeight: 600 }}>
                      {formatINR(parseFloat(q.totalAmount))}
                    </td>
                    <td>
                      <span
                        className={`badge ${statusColors[q.status] || "badge-gray"}`}
                      >
                        {q.status}
                      </span>
                    </td>
                    <td className="muted">
                      {q.createdAt
                        ? new Date(q.createdAt).toLocaleDateString("en-IN")
                        : "—"}
                    </td>
                    <td>
                      <Link
                        href={`/admin/quotations`}
                        className="btn btn-secondary btn-sm"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
