import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session || session.user.role !== "admin") redirect("/login");

  return (
    <div className="app-layout">
      <AdminSidebar user={session.user} />
      <div className="main-content">{children}</div>
    </div>
  );
}
