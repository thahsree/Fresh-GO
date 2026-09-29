import { io, Socket } from "socket.io-client";
import { getSocketUrl } from "./api";

let socket: Socket | null = null;
let currentHubSubscription: string | null = null;

export function getDeliverySocket(): Socket | null {
  return socket;
}

export function initDeliverySocket(
  token: string,
  callbacks?: {
    onConnect?: () => void;
    onDisconnect?: () => void;
    onError?: (err: any) => void;
    onNewHubOrder?: (order: any) => void;
    onOrderStatusChanged?: (data: any) => void;
  }
): Socket {
  if (socket?.connected) {
    return socket;
  }

  const socketUrl = getSocketUrl();
  console.log(`[Delivery Socket] Connecting to ${socketUrl}/tracking`);

  socket = io(`${socketUrl}/tracking`, {
    transports: ["websocket"],
    auth: {
      token,
    },
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
  });

  socket.on("connect", () => {
    console.log("[Delivery Socket] Connected successfully! ID:", socket?.id);
    callbacks?.onConnect?.();

    // Re-subscribe to active hub if reconnecting
    if (currentHubSubscription && socket) {
      socket.emit("subscribe:hub", { hubId: currentHubSubscription });
    }
  });

  socket.on("disconnect", (reason) => {
    console.log("[Delivery Socket] Disconnected:", reason);
    callbacks?.onDisconnect?.();
  });

  socket.on("connect_error", (error) => {
    console.warn("[Delivery Socket] Connection error:", error.message);
    callbacks?.onError?.(error);
  });

  if (callbacks?.onNewHubOrder) {
    socket.on("hub:order:new", (order) => {
      console.log("[Delivery Socket] Received new hub order:", order);
      callbacks.onNewHubOrder?.(order);
    });

    socket.on("partner:order:new", (order) => {
      console.log("[Delivery Socket] Received partner direct order:", order);
      callbacks.onNewHubOrder?.(order);
    });
  }

  if (callbacks?.onOrderStatusChanged) {
    socket.on("order:status:changed", (data) => {
      console.log("[Delivery Socket] Order status changed:", data);
      callbacks.onOrderStatusChanged?.(data);
    });
  }

  return socket;
}

export function subscribeToHub(hubId: string) {
  if (!hubId) return;
  currentHubSubscription = hubId;

  if (socket && socket.connected) {
    console.log(`[Delivery Socket] Subscribing to hub: ${hubId}`);
    socket.emit("subscribe:hub", { hubId });
  }
}

export function unsubscribeFromHub(hubId: string) {
  if (!hubId) return;
  if (currentHubSubscription === hubId) {
    currentHubSubscription = null;
  }

  if (socket && socket.connected) {
    console.log(`[Delivery Socket] Leaving hub: ${hubId}`);
    socket.emit("unsubscribe:hub", { hubId });
  }
}

export function emitLocationUpdate(data: {
  orderId?: string;
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
}) {
  if (socket && socket.connected) {
    socket.emit("partner:location:update", data);
  }
}

export function disconnectDeliverySocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    currentHubSubscription = null;
  }
}
