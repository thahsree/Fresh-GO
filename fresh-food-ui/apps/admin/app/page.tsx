"use client";

import { useState } from "react";
import { AdminHeader } from "./components/AdminHeader";
import { AdminNavigation, AdminSection } from "./components/AdminNavigation";
import { DashboardView } from "./components/DashboardView";
import { DispatchView } from "./components/DispatchView";
import { InventoryView } from "./components/InventoryView";
import { OrdersView } from "./components/OrdersView";
import { useProductController } from "./controllers/useProductController";
import { Product } from "./models/product";
import { ProductFormView } from "./views/ProductFormView";
import { ProductsView } from "./views/ProductsView";

type ProductDisplay =
  | { name: "list" }
  | { name: "create" }
  | { name: "edit"; product: Product };

export default function AdminPage() {
  const [section, setSection] = useState<AdminSection>("dashboard");
  const [productDisplay, setProductDisplay] = useState<ProductDisplay>({
    name: "list",
  });
  const [assigned, setAssigned] = useState<string[]>([]);
  const productController = useProductController();
  const assign = (id: string) => setAssigned((current) => [...current, id]);
  const showProductList = () => setProductDisplay({ name: "list" });
  const changeSection = (nextSection: AdminSection) => {
    setSection(nextSection);
    if (nextSection === "products") showProductList();
  };

  return (
    <div className="app">
      <AdminNavigation section={section} onSectionChange={changeSection} />
      <main className="main">
        <AdminHeader
          section={section}
          onViewOrders={() => setSection("orders")}
        />
        {section === "dashboard" && <DashboardView />}
        {section === "orders" && (
          <OrdersView assigned={assigned} onAssign={assign} />
        )}
        {section === "products" && productDisplay.name === "list" && (
          <ProductsView
            products={productController.products}
            deleteProduct={productController.deleteProduct}
            onCreate={() => setProductDisplay({ name: "create" })}
            onEdit={(product) => setProductDisplay({ name: "edit", product })}
          />
        )}
        {section === "products" && productDisplay.name === "create" && (
          <ProductFormView
            onCancel={showProductList}
            onSave={(input) => {
              productController.addProduct(input);
              showProductList();
            }}
          />
        )}
        {section === "products" && productDisplay.name === "edit" && (
          <ProductFormView
            product={productDisplay.product}
            onCancel={showProductList}
            onSave={(input) => {
              productController.updateProduct(productDisplay.product.id, input);
              showProductList();
            }}
          />
        )}
        {section === "inventory" && (
          <InventoryView products={productController.products} />
        )}
        {section === "dispatch" && (
          <DispatchView assigned={assigned} onAssign={assign} />
        )}
      </main>
    </div>
  );
}
