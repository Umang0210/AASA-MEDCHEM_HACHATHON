import { getProducts, getCategories } from "@/actions/product.actions";
import AdminProductsClient from "@/components/admin/AdminProductsClient";

export default async function AdminProductsPage() {
  const [allProducts, categories] = await Promise.all([
    getProducts(undefined, undefined, false), // show all including inactive
    getCategories(),
  ]);

  return (
    <div className="page-content">
      <AdminProductsClient
        initialProducts={allProducts}
        categories={categories}
      />
    </div>
  );
}
