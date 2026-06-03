import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import SellerSidebar from "@/components/seller/SellerSidebar";

export default async function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="app-layout">
      <SellerSidebar user={session.user} />
      <div className="main-content">{children}</div>
    </div>
  );
}
