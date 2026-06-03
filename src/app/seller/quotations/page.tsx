import { getMyQuotations } from "@/actions/quotation.actions";
import SellerQuotationsClient from "@/components/seller/SellerQuotationsClient";

export default async function SellerQuotationsPage() {
  const quotations = await getMyQuotations();
  return (
    <div className="page-content">
      <SellerQuotationsClient quotations={quotations} />
    </div>
  );
}
