import { colors } from "@fresh-food/design-tokens";
import {
  ArrowRight,
  Clock,
  MapPin,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  X,
} from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { Product } from "../models/catalog";

type OrderDetails = {
  items: { product: Product; quantity: number }[];
  total: number;
  paymentMethod: "cod" | "upi";
  address: string;
};

type OrderCountdownModalProps = {
  visible: boolean;
  orderDetails: OrderDetails | null;
  onConfirm: () => void;
  onCancel: () => void;
};

export function OrderCountdownModal({
  visible,
  orderDetails,
  onConfirm,
  onCancel,
}: OrderCountdownModalProps) {
  const [secondsLeft, setSecondsLeft] = useState(5);
  const [isFinishing, setIsFinishing] = useState(false);

  // Animations
  const progressAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!visible) {
      setSecondsLeft(5);
      setIsFinishing(false);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    // Reset countdown and start
    setSecondsLeft(5);
    setIsFinishing(false);
    progressAnim.setValue(1);

    // Smooth continuous bar drain over 5000ms
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: 5000,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();

    // Pulse animation helper
    const triggerPulse = () => {
      pulseAnim.setValue(1.35);
      Animated.spring(pulseAnim, {
        toValue: 1,
        friction: 4,
        tension: 100,
        useNativeDriver: true,
      }).start();
    };

    triggerPulse();

    let count = 5;
    timerRef.current = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setSecondsLeft(count);
        triggerPulse();
      } else {
        // Countdown reached 0
        setSecondsLeft(0);
        setIsFinishing(true);
        if (timerRef.current) clearInterval(timerRef.current);
        // Small pause to show 0/confirming state, then fire confirmation
        setTimeout(() => {
          onConfirm();
        }, 300);
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [visible]);

  const handleCancelPress = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    onCancel();
  };

  const handleImmediateConfirm = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsFinishing(true);
    onConfirm();
  };

  if (!visible || !orderDetails) return null;

  const itemCount = orderDetails.items.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const itemNamesPreview = orderDetails.items
    .map((item) => `${item.product.name} × ${item.quantity}`)
    .slice(0, 2)
    .join(", ");
  const hasMoreItems = orderDetails.items.length > 2;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleCancelPress}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleCancelPress} />

        <View style={styles.sheet}>
          {/* Header Drag Bar */}
          <View style={styles.dragBar} />

          {/* Title Row */}
          <View style={styles.headerRow}>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>
                {isFinishing ? "Dispatching..." : "Auto-Placing Order"}
              </Text>
            </View>
            <Pressable
              onPress={handleCancelPress}
              style={styles.closeIconBtn}
              accessibilityLabel="Cancel order"
            >
              <X size={18} color={colors.textMuted} />
            </Pressable>
          </View>

          {/* Central Animated Countdown Timer */}
          <View style={styles.timerCenter}>
            <View style={styles.circleOuter}>
              <Animated.View
                style={[
                  styles.circleInner,
                  {
                    transform: [{ scale: pulseAnim }],
                  },
                ]}
              >
                <Text style={styles.timerNumber}>
                  {isFinishing ? "✓" : secondsLeft}
                </Text>
              </Animated.View>
            </View>

            <Text style={styles.timerCaption}>
              {isFinishing
                ? "Placing order with Central Cold Hub..."
                : `Order will be placed in ${secondsLeft} second${secondsLeft === 1 ? "" : "s"}...`}
            </Text>

            {/* Linear Progress Bar */}
            <View style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0%", "100%"],
                    }),
                  },
                ]}
              />
            </View>
          </View>

          {/* Order Details Preview Box */}
          <View style={styles.orderPreviewBox}>
            <View style={styles.previewRow}>
              <View style={styles.previewIconBox}>
                <ShoppingBag size={16} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.previewLabel}>
                  {itemCount} Fresh Item{itemCount === 1 ? "" : "s"}
                </Text>
                <Text style={styles.previewSub} numberOfLines={1}>
                  {itemNamesPreview}
                  {hasMoreItems ? " & more" : ""}
                </Text>
              </View>
              <Text style={styles.previewTotal}>
                Rs {orderDetails.total.toLocaleString()}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.previewRow}>
              <View style={styles.previewIconBox}>
                <MapPin size={16} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.previewLabel}>Delivering to</Text>
                <Text style={styles.previewSub} numberOfLines={1}>
                  {orderDetails.address}
                </Text>
              </View>
              <View style={styles.payBadge}>
                <Text style={styles.payBadgeText}>
                  {orderDetails.paymentMethod === "cod" ? "COD" : "UPI"}
                </Text>
              </View>
            </View>
          </View>

          {/* Security & Cold Chain Guarantee */}
          <View style={styles.guaranteeRow}>
            <ShieldCheck size={14} color="#16A34A" />
            <Text style={styles.guaranteeText}>
              Zero cancellation fee during countdown · Temperature-controlled box
            </Text>
          </View>

          {/* Actions: Cancel Order (Prominent) vs Confirm Now */}
          <View style={styles.actionRow}>
            <Pressable
              style={styles.cancelBtn}
              onPress={handleCancelPress}
              accessibilityRole="button"
              accessibilityLabel="Cancel order countdown"
            >
              <X size={16} color="#DC2626" />
              <Text style={styles.cancelBtnText}>Cancel Order</Text>
            </Pressable>

            <Pressable
              style={[
                styles.confirmNowBtn,
                isFinishing && styles.confirmNowBtnActive,
              ]}
              onPress={handleImmediateConfirm}
              accessibilityRole="button"
              accessibilityLabel="Confirm immediately"
            >
              <Text style={styles.confirmNowBtnText}>
                {isFinishing ? "Placing..." : "Place Now"}
              </Text>
              <ArrowRight size={16} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(10, 20, 15, 0.65)",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    width: "100%",
    maxWidth: 540,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 20,
  },
  dragBar: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(0, 0, 0, 0.15)",
    alignSelf: "center",
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(22, 163, 74, 0.1)",
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#16A34A",
  },
  liveText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#16A34A",
  },
  closeIconBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  timerCenter: {
    alignItems: "center",
    marginVertical: 6,
  },
  circleOuter: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(22, 163, 74, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "rgba(22, 163, 74, 0.2)",
  },
  circleInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  timerNumber: {
    fontSize: 34,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  timerCaption: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primaryDark,
    marginBottom: 14,
    textAlign: "center",
  },
  progressTrack: {
    width: "100%",
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(0,0,0,0.06)",
    overflow: "hidden",
    marginBottom: 18,
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: "#16A34A",
  },
  orderPreviewBox: {
    backgroundColor: "#F8FAF9",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    marginBottom: 12,
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  previewIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  previewLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  previewSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  previewTotal: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.06)",
    marginVertical: 10,
  },
  payBadge: {
    backgroundColor: "rgba(0,0,0,0.06)",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  payBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  guaranteeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 18,
    paddingHorizontal: 10,
  },
  guaranteeText: {
    fontSize: 11,
    color: "#16A34A",
    fontWeight: "600",
    textAlign: "center",
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#DC2626",
  },
  confirmNowBtn: {
    flex: 1.3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmNowBtnActive: {
    backgroundColor: "#16A34A",
  },
  confirmNowBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
