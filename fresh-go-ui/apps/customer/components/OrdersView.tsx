import { colors } from "@fresh-food/design-tokens";
import {
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Package,
  Phone,
  RefreshCw,
  ShoppingBag,
  Truck,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { Product } from "../models/catalog";

export type CustomerOrder = {
  id: string;
  date: string;
  status: "placed" | "preparing" | "out_for_delivery" | "delivered";
  items: { product: Product; quantity: number }[];
  total: number;
  paymentMethod: "cod" | "upi";
  deliveryAddress: string;
  riderName?: string;
  riderPhone?: string;
  estimatedArrival?: string;
};

type OrdersViewProps = {
  orders: CustomerOrder[];
  onReorder: (items: { product: Product; quantity: number }[]) => void;
  onExploreProducts: () => void;
};

export function OrdersView({
  orders,
  onReorder,
  onExploreProducts,
}: OrdersViewProps) {
  const [selectedTab, setSelectedTab] = useState<"active" | "past">("active");

  const activeOrders = orders.filter((o) => o.status !== "delivered");
  const pastOrders = orders.filter((o) => o.status === "delivered");

  const displayOrders = selectedTab === "active" ? activeOrders : pastOrders;

  const getStatusDetails = (status: CustomerOrder["status"]) => {
    switch (status) {
      case "placed":
        return { label: "Order Placed", color: colors.warning, bg: colors.warningTint };
      case "preparing":
        return { label: "Preparing & Cut", color: colors.accent, bg: colors.accentTint };
      case "out_for_delivery":
        return { label: "Out for Delivery", color: colors.primary, bg: colors.primaryTint };
      case "delivered":
        return { label: "Delivered", color: colors.success, bg: colors.successTint };
    }
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Orders</Text>
        <Text style={styles.headerSubtitle}>
          Track active deliveries & view order history
        </Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, selectedTab === "active" && styles.tabActive]}
          onPress={() => setSelectedTab("active")}
        >
          <Text
            style={[
              styles.tabText,
              selectedTab === "active" && styles.tabTextActive,
            ]}
          >
            Active Orders ({activeOrders.length})
          </Text>
        </Pressable>

        <Pressable
          style={[styles.tab, selectedTab === "past" && styles.tabActive]}
          onPress={() => setSelectedTab("past")}
        >
          <Text
            style={[
              styles.tabText,
              selectedTab === "past" && styles.tabTextActive,
            ]}
          >
            Past Orders ({pastOrders.length})
          </Text>
        </Pressable>
      </View>

      {/* Orders List or Empty */}
      {displayOrders.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIconCircle}>
            <Package size={36} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>
            {selectedTab === "active" ? "No Active Orders" : "No Past Orders"}
          </Text>
          <Text style={styles.emptySub}>
            {selectedTab === "active"
              ? "All your orders have been delivered! Place a new order to track live delivery."
              : "You have not completed any orders yet."}
          </Text>
          <Pressable
            style={styles.shopBtn}
            onPress={onExploreProducts}
            accessibilityRole="button"
          >
            <Text style={styles.shopBtnText}>Shop Fresh Seafood & Meat</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.ordersList}>
          {displayOrders.map((order) => {
            const statusInfo = getStatusDetails(order.status);
            const isDelivered = order.status === "delivered";

            return (
              <View key={order.id} style={styles.orderCard}>
                {/* Top Row: ID & Status */}
                <View style={styles.cardTop}>
                  <View>
                    <Text style={styles.orderId}>Order #{order.id}</Text>
                    <Text style={styles.orderDate}>{order.date}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: statusInfo.bg },
                    ]}
                  >
                    <Text
                      style={[styles.statusText, { color: statusInfo.color }]}
                    >
                      {statusInfo.label}
                    </Text>
                  </View>
                </View>

                {/* Live Progress Tracker (for active orders) */}
                {!isDelivered && (
                  <View style={styles.timelineContainer}>
                    <View style={styles.timelineStep}>
                      <View
                        style={[
                          styles.timelineCircle,
                          styles.timelineCircleCompleted,
                        ]}
                      >
                        <Check size={11} color="#FFFFFF" strokeWidth={3} />
                      </View>
                      <Text style={styles.timelineLabel}>Placed</Text>
                    </View>
                    <View
                      style={[
                        styles.timelineLine,
                        order.status !== "placed" && styles.timelineLineActive,
                      ]}
                    />

                    <View style={styles.timelineStep}>
                      <View
                        style={[
                          styles.timelineCircle,
                          order.status !== "placed" &&
                            styles.timelineCircleCompleted,
                        ]}
                      >
                        {order.status !== "placed" ? (
                          <Check size={11} color="#FFFFFF" strokeWidth={3} />
                        ) : (
                          <View style={styles.timelineDot} />
                        )}
                      </View>
                      <Text style={styles.timelineLabel}>Preparing</Text>
                    </View>
                    <View
                      style={[
                        styles.timelineLine,
                        order.status === "out_for_delivery" &&
                          styles.timelineLineActive,
                      ]}
                    />

                    <View style={styles.timelineStep}>
                      <View
                        style={[
                          styles.timelineCircle,
                          order.status === "out_for_delivery" &&
                            styles.timelineCircleCompleted,
                        ]}
                      >
                        <Truck
                          size={11}
                          color={
                            order.status === "out_for_delivery"
                              ? "#FFFFFF"
                              : colors.textSoft
                          }
                        />
                      </View>
                      <Text style={styles.timelineLabel}>On the Way</Text>
                    </View>
                  </View>
                )}

                {/* Delivery Rider Banner */}
                {!isDelivered && order.riderName && (
                  <View style={styles.riderBanner}>
                    <View style={styles.riderInfo}>
                      <Truck size={16} color={colors.primary} />
                      <View>
                        <Text style={styles.riderName}>
                          {order.riderName} (Delivery Partner)
                        </Text>
                        <Text style={styles.riderEta}>
                          ⚡ {order.estimatedArrival ?? "Arriving in 20 mins"}
                        </Text>
                      </View>
                    </View>
                    <Pressable
                      style={styles.callBtn}
                      accessibilityLabel="Call delivery partner"
                    >
                      <Phone size={14} color={colors.primary} />
                    </Pressable>
                  </View>
                )}

                {/* Items in Order */}
                <View style={styles.itemsPreview}>
                  {order.items.map(({ product, quantity }) => (
                    <View key={product.id} style={styles.itemRow}>
                      <Image
                        source={{ uri: product.image }}
                        style={styles.itemThumb}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemTitle} numberOfLines={1}>
                          {product.name}
                        </Text>
                        <Text style={styles.itemMeta}>
                          Qty: {quantity} · Rs {product.price} {product.unit}
                        </Text>
                      </View>
                      <Text style={styles.itemLineTotal}>
                        Rs {(product.price * quantity).toLocaleString()}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Card Footer: Total & Actions */}
                <View style={styles.cardFooter}>
                  <View>
                    <Text style={styles.totalLabel}>
                      Total Paid ({order.paymentMethod.toUpperCase()})
                    </Text>
                    <Text style={styles.totalVal}>
                      Rs {order.total.toLocaleString()}
                    </Text>
                  </View>

                  {isDelivered ? (
                    <Pressable
                      style={styles.reorderBtn}
                      onPress={() => onReorder(order.items)}
                      accessibilityRole="button"
                    >
                      <RefreshCw size={14} color="#FFFFFF" />
                      <Text style={styles.reorderBtnText}>Reorder</Text>
                    </Pressable>
                  ) : (
                    <View style={styles.liveBadge}>
                      <View style={styles.liveDot} />
                      <Text style={styles.liveText}>Live Tracking</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 28,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    color: colors.primaryDark,
    fontSize: 22,
    fontWeight: "800",
  },
  headerSubtitle: {
    color: colors.textMuted,
    fontSize: 12.5,
    marginTop: 2,
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: colors.surfaceAlt,
    padding: 4,
    borderRadius: 12,
    marginBottom: 18,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: colors.surface,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    color: colors.textSoft,
    fontSize: 12.5,
    fontWeight: "700",
  },
  tabTextActive: {
    color: colors.primaryDark,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 32,
    alignItems: "center",
    marginTop: 20,
  },
  emptyIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    color: colors.primaryDark,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 6,
  },
  emptySub: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 20,
  },
  shopBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 999,
  },
  shopBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  ordersList: {
    gap: 16,
  },
  orderCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  orderId: {
    color: colors.primaryDark,
    fontSize: 15,
    fontWeight: "800",
  },
  orderDate: {
    color: colors.textSoft,
    fontSize: 11,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "800",
  },
  timelineContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceAlt,
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
  timelineStep: {
    alignItems: "center",
    gap: 4,
  },
  timelineCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineCircleCompleted: {
    backgroundColor: colors.success,
  },
  timelineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  timelineLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "700",
  },
  timelineLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: 8,
    marginBottom: 14,
  },
  timelineLineActive: {
    backgroundColor: colors.success,
  },
  riderBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.primaryTint,
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
  },
  riderInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  riderName: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "700",
  },
  riderEta: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "600",
  },
  callBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  itemsPreview: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    gap: 10,
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  itemThumb: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: colors.primaryTint,
  },
  itemTitle: {
    color: colors.text,
    fontSize: 12.5,
    fontWeight: "700",
  },
  itemMeta: {
    color: colors.textSoft,
    fontSize: 11,
  },
  itemLineTotal: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "700",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  totalLabel: {
    color: colors.textSoft,
    fontSize: 10.5,
    fontWeight: "600",
  },
  totalVal: {
    color: colors.primaryDark,
    fontSize: 15,
    fontWeight: "800",
  },
  reorderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  reorderBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.accentTint,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  liveText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: "800",
  },
});
