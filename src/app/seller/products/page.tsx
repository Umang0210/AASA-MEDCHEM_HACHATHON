import { getProducts, getCategories } from "@/actions/product.actions";
import SellerProductsClient from "@/components/seller/SellerProductsClient";

export default async function SellerProductsPage() {
  const [allProducts, categories] = await Promise.all([
    getProducts(),
    getCategories(),
  ]);

  return (
    <div className="page-content">
      <SellerProductsClient products={allProducts} categories={categories} />
    </div>
  );
}
