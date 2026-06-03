import { getAllOrders } from "@/actions/order.actions";
import AdminOrdersClient from "@/components/admin/AdminOrdersClient";

export default async function AdminOrdersPage() {
  const orders = await getAllOrders();
  return (
    <div className="page-content">
      <AdminOrdersClient orders={orders} />
    </div>
  );
}
