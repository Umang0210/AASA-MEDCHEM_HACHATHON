import { getAllQuotations } from "@/actions/quotation.actions";
import AdminQuotationsClient from "@/components/admin/AdminQuotationsClient";

export default async function AdminQuotationsPage() {
  const quotations = await getAllQuotations();
  return (
    <div className="page-content">
      <AdminQuotationsClient quotations={quotations} />
    </div>
  );
}
