import { colors } from "@fresh-food/design-tokens";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Package,
  Sparkles,
  Truck,
  X,
} from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  type OrderNotificationPayload,
  subscribeToNotifications,
} from "../lib/notifications";

type SnackbarProps = {
  onNavigateToOrders?: () => void;
};

export function SnackbarNotification({ onNavigateToOrders }: SnackbarProps) {
  const [notification, setNotification] =
    useState<OrderNotificationPayload | null>(null);

  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;
  const dismissTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = () => {
    if (dismissTimeout.current) {
      clearTimeout(dismissTimeout.current);
      dismissTimeout.current = null;
    }
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 250,
        useNativeDriver: true,
        easing: Easing.in(Easing.cubic),
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setNotification(null);
    });
  };

  useEffect(() => {
    const unsubscribe = subscribeToNotifications((payload) => {
      // Clear previous timer
      if (dismissTimeout.current) {
        clearTimeout(dismissTimeout.current);
      }

      setNotification(payload);
      progressAnim.setValue(1);

      // Slide in from top with spring bounce
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          friction: 8,
          tension: 65,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(progressAnim, {
          toValue: 0,
          duration: 4500,
          easing: Easing.linear,
          useNativeDriver: false,
        }),
      ]).start();

      dismissTimeout.current = setTimeout(() => {
        dismiss();
      }, 4500);
    });

    return () => {
      unsubscribe();
      if (dismissTimeout.current) {
        clearTimeout(dismissTimeout.current);
      }
    };
  }, []);

  if (!notification) return null;

  const getStatusIcon = (status: OrderNotificationPayload["status"]) => {
    switch (status) {
      case "placed":
        return <Sparkles size={20} color="#FFFFFF" />;
      case "confirmed":
      case "preparing":
      case "packing":
        return <Package size={20} color="#FFFFFF" />;
      case "out_for_delivery":
        return <Truck size={20} color="#FFFFFF" />;
      case "delivered":
        return <CheckCircle2 size={20} color="#FFFFFF" />;
      case "cancelled":
        return <AlertCircle size={20} color="#FFFFFF" />;
      default:
        return <Clock size={20} color="#FFFFFF" />;
    }
  };

  const getStatusColor = (status: OrderNotificationPayload["status"]) => {
    switch (status) {
      case "placed":
        return "#16A34A"; // vibrant green
      case "confirmed":
      case "preparing":
      case "packing":
        return "#EA580C"; // warm orange
      case "out_for_delivery":
        return "#0284C7"; // sky blue
      case "delivered":
        return "#059669"; // emerald
      case "cancelled":
        return "#DC2626"; // red
      default:
        return colors.primary;
    }
  };

  const statusBg = getStatusColor(notification.status);

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
      pointerEvents="box-none"
    >
      <Pressable
        style={styles.container}
        onPress={() => {
          dismiss();
          onNavigateToOrders?.();
        }}
        accessibilityRole="button"
        accessibilityLabel={`Notification: ${notification.title}`}
      >
        <View style={styles.card}>
          {/* Status Icon Badge */}
          <View style={[styles.iconBadge, { backgroundColor: statusBg }]}>
            {getStatusIcon(notification.status)}
          </View>

          {/* Text Content */}
          <View style={styles.textContainer}>
            <View style={styles.headerRow}>
              <Text style={styles.title} numberOfLines={1}>
                {notification.title}
              </Text>
              <Text style={styles.timeTag}>Just now</Text>
            </View>
            <Text style={styles.message} numberOfLines={2}>
              {notification.message}
            </Text>
          </View>

          {/* Close button */}
          <Pressable
            style={styles.closeBtn}
            onPress={(e) => {
              e.stopPropagation();
              dismiss();
            }}
            hitSlop={8}
            accessibilityLabel="Dismiss notification"
          >
            <X size={16} color={colors.textMuted} />
          </Pressable>

          {/* Auto-dismiss drain progress bar */}
          <Animated.View
            style={[
              styles.progressBar,
              {
                backgroundColor: statusBg,
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0%", "100%"],
                }),
              },
            ]}
          />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    top: 50,
    left: 14,
    right: 14,
    zIndex: 9999,
    elevation: 10,
    alignItems: "center",
  },
  container: {
    width: "100%",
    maxWidth: 520,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    paddingBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 8,
    overflow: "hidden",
  },
  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primaryDark,
    flex: 1,
    marginRight: 6,
  },
  timeTag: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.textMuted,
  },
  message: {
    fontSize: 12,
    color: colors.text,
    lineHeight: 16,
  },
  closeBtn: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.04)",
  },
  progressBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    height: 3,
  },
});
