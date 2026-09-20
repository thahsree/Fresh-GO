import { colors } from "@fresh-food/design-tokens";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  MapPin,
  Minus,
  Plus,
  ShoppingBag,
  Tag,
  Trash2,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { allProducts, type Product } from "../models/catalog";

export type CartItem = {
  productId: string;
  quantity: number;
  selectedCut?: string;
};

type CartViewProps = {
  cart: { [productId: string]: number };
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onExploreProducts: () => void;
  onPlaceOrder: (order: {
    items: { product: Product; quantity: number }[];
    total: number;
    paymentMethod: "cod" | "upi";
    address: string;
  }) => void;
};

export function CartView({
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onExploreProducts,
  onPlaceOrder,
}: CartViewProps) {
  const [couponCode, setCouponCode] = useState("FRESH50");
  const [couponApplied, setCouponApplied] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "upi">("cod");
  const [deliveryAddress, setDeliveryAddress] = useState(
    "Palm Residency, Flat 402, 4th Cross Road",
  );

  const cartEntries = Object.entries(cart).filter(([_, qty]) => qty > 0);
  const itemsWithProduct = cartEntries
    .map(([id, qty]) => {
      const product = allProducts.find((p) => p.id === id);
      return product ? { product, quantity: qty } : null;
    })
    .filter(
      (item): item is { product: Product; quantity: number } => item !== null,
    );

  const itemsTotal = itemsWithProduct.reduce(
    (sum, { product, quantity }) => sum + product.price * quantity,
    0,
  );

  const deliveryFee = itemsTotal >= 499 || itemsTotal === 0 ? 0 : 40;
  const handlingFee = itemsTotal > 0 ? 15 : 0;
  const discount = couponApplied ? Math.min(50, itemsTotal) : 0;
  const grandTotal = Math.max(0, itemsTotal + deliveryFee + handlingFee - discount);

  const handleApplyCoupon = () => {
    if (couponCode.trim().toUpperCase() === "FRESH50") {
      setCouponApplied(true);
    }
  };

  const handleCheckout = () => {
    if (itemsWithProduct.length === 0) return;
    onPlaceOrder({
      items: itemsWithProduct,
      total: grandTotal,
      paymentMethod,
      address: deliveryAddress,
    });
  };

  if (itemsWithProduct.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconBg}>
          <ShoppingBag size={48} color={colors.primary} />
        </View>
        <Text style={styles.emptyTitle}>Your Cart is Empty</Text>
        <Text style={styles.emptySubtitle}>
          Looks like you haven't added any fresh seafood or farm meat to your cart yet.
        </Text>
        <Pressable
          style={styles.exploreBtn}
          onPress={onExploreProducts}
          accessibilityRole="button"
        >
          <Text style={styles.exploreBtnText}>Explore Fresh Today</Text>
          <ArrowRight size={16} color="#FFFFFF" />
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {/* Title */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Shopping Cart</Text>
        <Text style={styles.itemCount}>
          {itemsWithProduct.length} {itemsWithProduct.length === 1 ? "item" : "items"}
        </Text>
      </View>

      {/* Delivery Address Banner */}
      <View style={styles.addressCard}>
        <View style={styles.addressLeft}>
          <MapPin size={18} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.addressLabel}>Delivering to</Text>
            <Text style={styles.addressText} numberOfLines={1}>
              {deliveryAddress}
            </Text>
          </View>
        </View>
        <View style={styles.etaBadge}>
          <Clock size={12} color={colors.success} />
          <Text style={styles.etaText}>25 mins</Text>
        </View>
      </View>

      {/* Cart Items List */}
      <View style={styles.itemsList}>
        {itemsWithProduct.map(({ product, quantity }) => (
          <View key={product.id} style={styles.itemCard}>
            <Image
              source={{ uri: product.image }}
              style={styles.itemImage}
              resizeMode="cover"
            />
            <View style={styles.itemDetails}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {product.name}
                </Text>
                <Pressable
                  onPress={() => onRemoveItem(product.id)}
                  style={styles.removeBtn}
                  accessibilityLabel="Remove item"
                >
                  <Trash2 size={15} color={colors.textSoft} />
                </Pressable>
              </View>
              <Text style={styles.itemPrice}>
                Rs {product.price.toLocaleString()}
                <Text style={styles.itemUnit}> {product.unit}</Text>
              </Text>

              <View style={styles.itemFooter}>
                <View style={styles.stepper}>
                  <Pressable
                    style={styles.stepBtn}
                    onPress={() =>
                      onUpdateQuantity(product.id, Math.max(0, quantity - 1))
                    }
                  >
                    <Minus size={13} color={colors.primaryDark} />
                  </Pressable>
                  <Text style={styles.qtyText}>{quantity}</Text>
                  <Pressable
                    style={styles.stepBtn}
                    onPress={() => onUpdateQuantity(product.id, quantity + 1)}
                  >
                    <Plus size={13} color={colors.primaryDark} />
                  </Pressable>
                </View>
                <Text style={styles.lineTotal}>
                  Rs {(product.price * quantity).toLocaleString()}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Promo Code Section */}
      <View style={styles.couponCard}>
        <View style={styles.couponHeader}>
          <Tag size={16} color={colors.accent} />
          <Text style={styles.couponTitle}>Offers & Coupons</Text>
        </View>
        <View style={styles.couponInputRow}>
          <TextInput
            value={couponCode}
            onChangeText={setCouponCode}
            placeholder="Enter promo code"
            style={styles.couponInput}
            autoCapitalize="characters"
          />
          <Pressable
            style={[
              styles.applyBtn,
              couponApplied && styles.applyBtnApplied,
            ]}
            onPress={handleApplyCoupon}
          >
            <Text style={styles.applyBtnText}>
              {couponApplied ? "Applied ✓" : "Apply"}
            </Text>
          </Pressable>
        </View>
        {couponApplied && (
          <Text style={styles.couponSuccess}>
            🎉 Promo FRESH50 applied! You saved Rs 50.
          </Text>
        )}
      </View>

      {/* Payment Method */}
      <View style={styles.paymentSection}>
        <Text style={styles.sectionHeader}>Select Payment Method</Text>
        <View style={styles.paymentOptions}>
          <Pressable
            style={[
              styles.paymentOption,
              paymentMethod === "cod" && styles.paymentOptionSelected,
            ]}
            onPress={() => setPaymentMethod("cod")}
          >
            <View style={styles.radio}>
              {paymentMethod === "cod" && <View style={styles.radioDot} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.paymentTitle}>Cash on Delivery (COD)</Text>
              <Text style={styles.paymentSubtitle}>Pay cash or scan QR at doorstep</Text>
            </View>
          </Pressable>

          <Pressable
            style={[
              styles.paymentOption,
              paymentMethod === "upi" && styles.paymentOptionSelected,
            ]}
            onPress={() => setPaymentMethod("upi")}
          >
            <View style={styles.radio}>
              {paymentMethod === "upi" && <View style={styles.radioDot} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.paymentTitle}>UPI / Online Payment</Text>
              <Text style={styles.paymentSubtitle}>Google Pay, PhonePe, Paytm</Text>
            </View>
          </Pressable>
        </View>
      </View>

      {/* Bill Details */}
      <View style={styles.billCard}>
        <Text style={styles.sectionHeader}>Bill Details</Text>
        <View style={styles.billRow}>
          <Text style={styles.billLabel}>Item Total</Text>
          <Text style={styles.billVal}>Rs {itemsTotal.toLocaleString()}</Text>
        </View>
        <View style={styles.billRow}>
          <Text style={styles.billLabel}>Delivery Fee</Text>
          <Text style={[styles.billVal, deliveryFee === 0 && styles.freeDelivery]}>
            {deliveryFee === 0 ? "FREE" : `Rs ${deliveryFee}`}
          </Text>
        </View>
        <View style={styles.billRow}>
          <Text style={styles.billLabel}>Handling & Packaging</Text>
          <Text style={styles.billVal}>Rs {handlingFee}</Text>
        </View>
        {couponApplied && (
          <View style={styles.billRow}>
            <Text style={[styles.billLabel, styles.savingText]}>
              Coupon Discount
            </Text>
            <Text style={[styles.billVal, styles.savingText]}>- Rs {discount}</Text>
          </View>
        )}
        <View style={styles.divider} />
        <View style={styles.billRow}>
          <Text style={styles.grandTotalLabel}>To Pay</Text>
          <Text style={styles.grandTotalVal}>Rs {grandTotal.toLocaleString()}</Text>
        </View>
      </View>

      {/* Place Order CTA */}
      <View style={styles.checkoutBar}>
        <View>
          <Text style={styles.checkoutTotalLabel}>Grand Total</Text>
          <Text style={styles.checkoutTotal}>Rs {grandTotal.toLocaleString()}</Text>
        </View>
        <Pressable
          style={styles.placeOrderBtn}
          onPress={handleCheckout}
          accessibilityRole="button"
        >
          <Text style={styles.placeOrderBtnText}>Place Order</Text>
          <ArrowRight size={18} color="#FFFFFF" />
        </Pressable>
      </View>
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
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerTitle: {
    color: colors.primaryDark,
    fontSize: 22,
    fontWeight: "800",
  },
  itemCount: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emptyIconBg: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    color: colors.primaryDark,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 8,
  },
  emptySubtitle: {
    color: colors.textMuted,
    fontSize: 13.5,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  exploreBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 999,
  },
  exploreBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  addressCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  addressLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  addressLabel: {
    color: colors.textSoft,
    fontSize: 10.5,
    fontWeight: "600",
  },
  addressText: {
    color: colors.text,
    fontSize: 12.5,
    fontWeight: "700",
    marginTop: 1,
  },
  etaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.successTint,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  etaText: {
    color: colors.success,
    fontSize: 11,
    fontWeight: "700",
  },
  itemsList: {
    gap: 12,
    marginBottom: 16,
  },
  itemCard: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 12,
  },
  itemImage: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: colors.primaryTint,
  },
  itemDetails: {
    flex: 1,
    justifyContent: "space-between",
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemName: {
    color: colors.text,
    fontSize: 13.5,
    fontWeight: "700",
    flex: 1,
    marginRight: 8,
  },
  removeBtn: {
    padding: 4,
  },
  itemPrice: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
  },
  itemUnit: {
    color: colors.textSoft,
    fontSize: 11,
    fontWeight: "500",
  },
  itemFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surfaceAlt,
  },
  stepBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  qtyText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "800",
    minWidth: 18,
    textAlign: "center",
  },
  lineTotal: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "800",
  },
  couponCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 16,
  },
  couponHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  couponTitle: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "700",
  },
  couponInputRow: {
    flexDirection: "row",
    gap: 10,
  },
  couponInput: {
    flex: 1,
    height: 40,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  applyBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  applyBtnApplied: {
    backgroundColor: colors.success,
  },
  applyBtnText: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "700",
  },
  couponSuccess: {
    color: colors.success,
    fontSize: 11.5,
    fontWeight: "700",
    marginTop: 8,
  },
  paymentSection: {
    marginBottom: 16,
  },
  sectionHeader: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 10,
  },
  paymentOptions: {
    gap: 10,
  },
  paymentOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  paymentOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: colors.primary,
  },
  paymentTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  paymentSubtitle: {
    color: colors.textSoft,
    fontSize: 11,
    marginTop: 1,
  },
  billCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 20,
  },
  billRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 4,
  },
  billLabel: {
    color: colors.textMuted,
    fontSize: 12.5,
  },
  billVal: {
    color: colors.text,
    fontSize: 12.5,
    fontWeight: "700",
  },
  freeDelivery: {
    color: colors.success,
  },
  savingText: {
    color: colors.success,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 8,
  },
  grandTotalLabel: {
    color: colors.primaryDark,
    fontSize: 15,
    fontWeight: "800",
  },
  grandTotalVal: {
    color: colors.accent,
    fontSize: 17,
    fontWeight: "800",
  },
  checkoutBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  checkoutTotalLabel: {
    color: colors.textSoft,
    fontSize: 11,
    fontWeight: "700",
  },
  checkoutTotal: {
    color: colors.primaryDark,
    fontSize: 18,
    fontWeight: "800",
  },
  placeOrderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 12,
  },
  placeOrderBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
