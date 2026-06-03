import SellerCartClient from "@/components/seller/SellerCartClient";
import { getProducts } from "@/actions/product.actions";

export default async function CartPage() {
  const products = await getProducts();
  return (
    <div className="page-content">
      <SellerCartClient products={products} />
    </div>
  );
}
