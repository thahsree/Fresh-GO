import Constants, { ExecutionEnvironment } from "expo-constants";
import { AppState, Platform } from "react-native";

export type OrderNotificationPayload = {
  orderId: string;
  status:
    | "placed"
    | "confirmed"
    | "preparing"
    | "packing"
    | "out_for_delivery"
    | "delivered"
    | "cancelled";
  title: string;
  message: string;
  timestamp?: string;
};

export type NotificationSubscriber = (
  notification: OrderNotificationPayload,
) => void;

const subscribers: Set<NotificationSubscriber> = new Set();

// Expo Go on Android does not support native push/notifications in SDK 51+
// Attempting to load native notifications in Expo Go triggers "Runtime not ready"
const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let cachedNotificationsModule: any = null;

function getNativeNotifications() {
  if (isExpoGo || Platform.OS === "web") {
    return null;
  }
  if (cachedNotificationsModule) {
    return cachedNotificationsModule;
  }
  try {
    // Dynamic require so expo-notifications is never initialized during Expo Go startup
    const mod = require("expo-notifications");
    mod.setNotificationHandler?.({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    cachedNotificationsModule = mod;
    return mod;
  } catch (e) {
    return null;
  }
}

/**
 * Request notification permissions safely without crashing in Expo Go or Web.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "granted") return true;
        const res = await Notification.requestPermission();
        return res === "granted";
      }
      return false;
    }

    if (isExpoGo) {
      // In Expo Go, in-app snackbar notifications are used to prevent runtime errors
      return true;
    }

    const nativeMod = getNativeNotifications();
    if (!nativeMod) return true;

    const { status: existingStatus } = await nativeMod.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await nativeMod.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === "granted";
  } catch (err) {
    return false;
  }
}

/**
 * Checks whether the app is currently in the foreground / active.
 */
export function isAppActive(): boolean {
  if (Platform.OS === "web") {
    return typeof document !== "undefined" ? !document.hidden : true;
  }
  return AppState.currentState === "active";
}

/**
 * Subscribe to in-app notifications (Snackbar).
 */
export function subscribeToNotifications(
  subscriber: NotificationSubscriber,
): () => void {
  subscribers.add(subscriber);
  return () => {
    subscribers.delete(subscriber);
  };
}

/**
 * Send a native / mobile system notification if supported.
 */
export async function sendMobileSystemNotification(
  title: string,
  body: string,
  data?: Record<string, any>,
) {
  try {
    if (Platform.OS === "web") {
      if (
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        new Notification(title, {
          body,
          icon: "/freshgologo.png",
        });
      }
      return;
    }

    if (isExpoGo) {
      // In Expo Go on Android, native notifications trigger "Runtime not ready"
      // In-app snackbar is used instead
      return;
    }

    const nativeMod = getNativeNotifications();
    if (nativeMod?.scheduleNotificationAsync) {
      await nativeMod.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          data: data || {},
        },
        trigger: null,
      });
    }
  } catch (err) {
    // Graceful fallback
  }
}

/**
 * Unified notification dispatcher:
 * - Always triggers in-app snackbar notifications so the user gets instant, animated visual feedback.
 * - In standalone apps, also sends mobile system notifications when backgrounded.
 */
export async function dispatchOrderNotification(
  payload: OrderNotificationPayload,
) {
  // 1. Always notify in-app subscribers (Snackbar)
  subscribers.forEach((cb) => {
    try {
      cb(payload);
    } catch (err) {
      console.warn("Notification subscriber notice:", err);
    }
  });

  // 2. If app is not in foreground, send mobile system notification (where supported)
  const inForeground = isAppActive();
  if (!inForeground) {
    await sendMobileSystemNotification(payload.title, payload.message, {
      orderId: payload.orderId,
      status: payload.status,
    });
  }
}
