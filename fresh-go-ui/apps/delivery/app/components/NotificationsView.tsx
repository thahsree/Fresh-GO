"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Banknote,
  Bell,
  CheckCheck,
  Package,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { DeliveryNotification, NotificationCategory } from "../models/delivery";

type NotificationsViewProps = {
  notifications: DeliveryNotification[];
  onBack: () => void;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll?: () => void;
};

const categoryIconMap: Record<NotificationCategory, React.ComponentType<{ size?: number; className?: string }>> = {
  incentive: TrendingUp,
  payout: Banknote,
  safety: ShieldCheck,
  order: Package,
  system: Bell,
};

const categoryColorMap: Record<NotificationCategory, string> = {
  incentive: "cat-incentive",
  payout: "cat-payout",
  safety: "cat-safety",
  order: "cat-order",
  system: "cat-system",
};

export function NotificationsView({
  notifications,
  onBack,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
}: NotificationsViewProps) {
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const filteredNotifications = notifications.filter((n) => {
    if (filter === "unread") return !n.isRead;
    return true;
  });

  return (
    <div className="notifications-view">
      {/* Subpage Header matching Help & Safety views */}
      <div className="subpage-header">
        <button
          type="button"
          className="back-btn"
          onClick={onBack}
          aria-label="Go back"
        >
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>
        <div className="subpage-badge">
          {unreadCount > 0 ? `${unreadCount} New` : "Inbox"}
        </div>
      </div>

      <div className="view-heading compact">
        <span className="eyebrow">Updates & Alerts</span>
        <div className="title-with-action">
          <h1>Notifications</h1>
          {unreadCount > 0 && (
            <button
              type="button"
              className="mark-read-btn"
              onClick={onMarkAllAsRead}
              title="Mark all as read"
            >
              <CheckCheck size={15} />
              <span>Mark all read</span>
            </button>
          )}
        </div>
        <p>Stay informed about earnings surges, payouts, and safety updates.</p>
      </div>

      {/* Filter Pills with proper theme styling */}
      <div className="filter-pills">
        <button
          type="button"
          className={filter === "all" ? "active" : ""}
          onClick={() => setFilter("all")}
        >
          All ({notifications.length})
        </button>
        <button
          type="button"
          className={filter === "unread" ? "active" : ""}
          onClick={() => setFilter("unread")}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {filteredNotifications.length === 0 ? (
        <div className="empty-state notification-empty">
          <div className="empty-icon">
            <Bell size={24} />
          </div>
          <h2>No notifications</h2>
          <p>
            {filter === "unread"
              ? "You've read all your notifications! Switch to All to review previous updates."
              : "You don't have any notifications right now."}
          </p>
        </div>
      ) : (
        <div className="notifications-list">
          {filteredNotifications.map((item) => {
            const Icon = categoryIconMap[item.category] || Bell;
            const categoryClass = categoryColorMap[item.category] || "cat-system";

            return (
              <article
                key={item.id}
                className={`notification-item ${!item.isRead ? "unread" : "read"}`}
                onClick={() => {
                  if (!item.isRead) onMarkAsRead(item.id);
                }}
              >
                <div className={`notification-icon ${categoryClass}`}>
                  <Icon size={18} />
                </div>
                <div className="notification-body">
                  <div className="notification-meta">
                    <span className={`notification-badge ${categoryClass}`}>
                      {item.category.toUpperCase()}
                    </span>
                    <span className="notification-time">{item.timestamp}</span>
                    {!item.isRead && <span className="notification-dot-unread" title="Unread" />}
                  </div>
                  <h3 className="notification-title">{item.title}</h3>
                  <p className="notification-message">{item.message}</p>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {notifications.length > 0 && onClearAll && (
        <button
          type="button"
          className="text-action clear-notifications-btn"
          onClick={onClearAll}
        >
          Clear all notifications
        </button>
      )}
    </div>
  );
}
