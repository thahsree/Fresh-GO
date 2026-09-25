"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminHeader } from "./components/AdminHeader";
import { AdminNavigation, AdminSection } from "./components/AdminNavigation";
import { DashboardView } from "./components/DashboardView";
import { DispatchView } from "./components/DispatchView";
import { InventoryView } from "./components/InventoryView";
import { OrdersView } from "./components/OrdersView";
import { useProductController } from "./controllers/useProductController";
import { useDispatchController } from "./controllers/useDispatchController";
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
  const [toast, setToast] = useState<{
    message: string;
    title?: string;
    type: "success" | "error" | "info" | "delete";
  } | null>(null);

  const productController = useProductController();
  const dispatchController = useDispatchController();

  const showToast = (
    message: string,
    type: "success" | "error" | "info" | "delete" = "success",
    title?: string
  ) => {
    setToast({ message, type, title });
    setTimeout(() => {
      setToast((cur) => (cur?.message === message ? null : cur));
    }, 4500);
  };

  const assign = async (orderId: string, partnerProfileId?: string) => {
    setAssigned((current) => [...current, orderId]);
    const res = await dispatchController.assignOrder(orderId, partnerProfileId);
    if (res?.success) {
      showToast(
        res.message || `Order #${orderId} assigned to partner`,
        "success"
      );
    } else {
      showToast(res?.error || `Could not assign order #${orderId}`, "error");
    }
  };

  const handleUpdateStatus = async (orderId: string, status: string) => {
    const res = await dispatchController.updateOrderStatus(orderId, status);
    if (res?.success) {
      showToast(res.message || `Order status updated to ${status}`, "success");
    } else {
      showToast(res?.error || `Could not update status to ${status}`, "error");
    }
  };

  // Synchronize state with URL hash & browser history
  const changeSection = useCallback(
    (nextSection: AdminSection, pushHistory = true) => {
      setSection(nextSection);
      setProductDisplay({ name: "list" });
      if (pushHistory && typeof window !== "undefined") {
        const nextHash = `#${nextSection}`;
        if (window.location.hash !== nextHash) {
          window.history.pushState(
            { section: nextSection, display: "list" },
            "",
            nextHash
          );
        }
      }
    },
    []
  );

  const showProductList = useCallback((pushHistory = true) => {
    setProductDisplay({ name: "list" });
    if (pushHistory && typeof window !== "undefined") {
      if (window.location.hash.startsWith("#products/")) {
        window.history.back();
      } else if (window.location.hash !== "#products") {
        window.history.pushState(
          { section: "products", display: "list" },
          "",
          "#products"
        );
      }
    }
  }, []);

  const handleCreateProduct = useCallback(() => {
    setProductDisplay({ name: "create" });
    if (typeof window !== "undefined") {
      window.history.pushState(
        { section: "products", display: "create" },
        "",
        "#products/create"
      );
    }
  }, []);

  const handleEditProduct = useCallback((product: Product) => {
    setProductDisplay({ name: "edit", product });
    if (typeof window !== "undefined") {
      window.history.pushState(
        { section: "products", display: "edit", productId: product.id },
        "",
        `#products/edit/${product.id}`
      );
    }
  }, []);

  // System back / forward button integration
  useEffect(() => {
    if (typeof window === "undefined") return;

    const parseLocationHash = () => {
      const hash = window.location.hash.replace(/^#\/?/, "").toLowerCase();

      if (!hash || hash === "dashboard") {
        setSection("dashboard");
        setProductDisplay({ name: "list" });
        return;
      }

      if (hash === "orders") {
        setSection("orders");
        return;
      }

      if (hash === "inventory") {
        setSection("inventory");
        return;
      }

      if (hash === "dispatch") {
        setSection("dispatch");
        return;
      }

      if (hash.startsWith("products")) {
        setSection("products");
        if (hash === "products/create") {
          setProductDisplay({ name: "create" });
        } else if (hash.startsWith("products/edit/")) {
          const id = hash.replace("products/edit/", "").trim();
          const target = productController.products.find((p) => p.id === id);
          if (target) {
            setProductDisplay({ name: "edit", product: target });
          } else {
            setProductDisplay({ name: "list" });
          }
        } else {
          setProductDisplay({ name: "list" });
        }
        return;
      }

      // Default fallback
      setSection("dashboard");
      setProductDisplay({ name: "list" });
    };

    // On initial load: replace empty hash with #dashboard or parse existing hash
    if (!window.location.hash) {
      window.history.replaceState(
        { section: "dashboard", display: "list" },
        "",
        "#dashboard"
      );
    } else {
      parseLocationHash();
    }

    window.addEventListener("popstate", parseLocationHash);
    return () => {
      window.removeEventListener("popstate", parseLocationHash);
    };
  }, [productController.products]);

  return (
    <div className="app">
      {toast && (
        <div
          key={toast.message}
          style={{
            position: "fixed",
            top: 24,
            right: 28,
            zIndex: 9999,
            minWidth: "320px",
            maxWidth: "420px",
            borderRadius: "10px",
            boxShadow:
              toast.type === "delete"
                ? "0 18px 40px rgba(190, 68, 54, 0.28), 0 4px 12px rgba(0, 0, 0, 0.15)"
                : "0 12px 30px rgba(0, 0, 0, 0.16)",
            background:
              toast.type === "delete"
                ? "#17211E"
                : toast.type === "success"
                ? "#0F2E29"
                : toast.type === "error"
                ? "#BE4436"
                : "#1F4D46",
            border:
              toast.type === "delete"
                ? "1px solid rgba(190, 68, 54, 0.45)"
                : "1px solid rgba(255, 255, 255, 0.1)",
            borderLeft:
              toast.type === "delete"
                ? "5px solid #BE4436"
                : toast.type === "success"
                ? "5px solid #2E7D5B"
                : "none",
            color: "#FFFFFF",
            animation: "toastSlideInTop 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "14px 18px",
              display: "flex",
              alignItems: "flex-start",
              gap: "12px",
            }}
          >
            {toast.type === "delete" ? (
              <span
                className="trash-shake"
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  background: "#FBE7E3",
                  color: "#BE4436",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "16px",
                  flexShrink: 0,
                }}
              >
                🗑️
              </span>
            ) : (
              <span
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background:
                    toast.type === "success"
                      ? "rgba(46, 125, 91, 0.3)"
                      : "rgba(190, 68, 54, 0.3)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "13px",
                  flexShrink: 0,
                }}
              >
                {toast.type === "success"
                  ? "✓"
                  : toast.type === "error"
                  ? "⚠️"
                  : "ℹ️"}
              </span>
            )}
            <div style={{ flex: 1 }}>
              {toast.title && (
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: "13.5px",
                    marginBottom: 3,
                    color: toast.type === "delete" ? "#FF8070" : "#FFFFFF",
                  }}
                >
                  {toast.title}
                </div>
              )}
              <div
                style={{
                  color: "rgba(255, 255, 255, 0.9)",
                  lineHeight: "1.4",
                  fontSize: "12.5px",
                  fontWeight: 500,
                }}
              >
                {toast.message}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              style={{
                background: "transparent",
                border: "none",
                color: "rgba(255, 255, 255, 0.6)",
                cursor: "pointer",
                padding: "2px",
                fontSize: "16px",
                lineHeight: 1,
              }}
              title="Dismiss"
            >
              ✕
            </button>
          </div>
          {/* Animated Drain Timer */}
          <div
            style={{
              height: "3px",
              background:
                toast.type === "delete"
                  ? "#BE4436"
                  : toast.type === "success"
                  ? "#2E7D5B"
                  : "rgba(255, 255, 255, 0.3)",
              animation: "toastDrain 4.5s linear forwards",
            }}
          />
        </div>
      )}

      <AdminNavigation section={section} onSectionChange={changeSection} />
      <main className="main">
        <AdminHeader
          section={section}
          onViewOrders={() => changeSection("orders")}
          isBackendConnected={productController.isBackendConnected}
        />

        {section === "dashboard" && (
          <DashboardView
            orders={dispatchController.orders}
            products={productController.products}
            partners={dispatchController.partners}
          />
        )}

        {section === "orders" && (
          <OrdersView
            assigned={assigned}
            onAssign={(id) => assign(id)}
            liveOrders={dispatchController.orders}
            onUpdateStatus={handleUpdateStatus}
            isLoading={dispatchController.isLoading}
          />
        )}

        {section === "products" && productDisplay.name === "list" && (
          <ProductsView
            products={productController.products}
            deleteProduct={async (id: string) => {
              const target = productController.products.find(
                (p) => p.id === id
              );
              const name = target?.name || "Product";
              await productController.deleteProduct(id);
              showToast(
                `"${name}" has been removed from catalogue and inventory.`,
                "delete",
                "Product Deleted"
              );
            }}
            updateProduct={async (id: string, input: any) => {
              await productController.updateProduct(id, input);
              showToast(`Updated badges for product`, "success");
            }}
            onCreate={handleCreateProduct}
            onEdit={handleEditProduct}
          />
        )}

        {section === "products" && productDisplay.name === "create" && (
          <ProductFormView
            categories={productController.categories}
            onCancel={showProductList}
            onSave={async (input) => {
              await productController.addProduct(input);
              showToast(`Product "${input.name}" saved to catalogue`, "success");
              showProductList();
            }}
          />
        )}

        {section === "products" && productDisplay.name === "edit" && (
          <ProductFormView
            product={productDisplay.product}
            categories={productController.categories}
            onCancel={showProductList}
            onSave={async (input) => {
              await productController.updateProduct(productDisplay.product.id, input);
              showToast(`Product "${input.name}" updated`, "success");
              showProductList();
            }}
          />
        )}

        {section === "inventory" && (
          <InventoryView
            products={productController.products}
            onUpdateStock={async (id: string, newStock: number) => {
              const target = productController.products.find((p) => p.id === id);
              if (!target) return;
              await productController.updateProduct(id, {
                ...target,
                stock: newStock,
              });
              showToast(
                `Stock for "${target.name}" adjusted to ${newStock} ${target.unit}`,
                "success"
              );
            }}
          />
        )}

        {section === "dispatch" && (
          <DispatchView
            assigned={assigned}
            onAssign={assign}
            orders={dispatchController.orders}
            partners={dispatchController.partners}
          />
        )}
      </main>
    </div>
  );
}
