"use client";

import { useDeliveryController } from "../controllers/useDeliveryController";
import { ActiveDeliveryView } from "./ActiveDeliveryView";
import { DashboardView } from "./DashboardView";
import { DeliveryHeader } from "./DeliveryHeader";
import { DeliveryNavigation } from "./DeliveryNavigation";
import { EarningsView } from "./EarningsView";
import { HelpCenterView } from "./HelpCenterView";
import { HistoryView } from "./HistoryView";
import { NotificationsView } from "./NotificationsView";
import { ReportIssueView } from "./ReportIssueView";
import { SafetyToolkitView } from "./SafetyToolkitView";
import { SettingsView } from "./SettingsView";
import { SplashScreen } from "./SplashScreen";

export function DeliveryApp() {
  const delivery = useDeliveryController();

  return (
    <>
      <SplashScreen />
      <main className="delivery-shell">
        <DeliveryHeader
          isOnline={delivery.isOnline}
          onOpenSafety={delivery.openSafety}
          onOpenNotifications={delivery.openNotifications}
          unreadNotificationsCount={delivery.unreadNotificationCount}
        />
        <section className="delivery-content">
          {delivery.tab === "dashboard" && (
            <DashboardView
              isOnline={delivery.isOnline}
              request={delivery.request}
              todayEarnings={delivery.todayEarnings}
              onAccept={delivery.acceptRequest}
              onDecline={delivery.declineRequest}
              onOpenHistory={() => delivery.setTab("history")}
            />
          )}
          {delivery.tab === "active" && (
            <ActiveDeliveryView
              delivery={delivery.activeDelivery}
              onAdvance={delivery.advanceDelivery}
              onOpenDashboard={() => delivery.setTab("dashboard")}
              onOpenReport={delivery.openReport}
              onOpenSafety={delivery.openSafety}
            />
          )}
          {delivery.tab === "earnings" && (
            <EarningsView
              todayEarnings={delivery.todayEarnings}
              weeklyTotal={delivery.weeklyEarnings}
              onOpenHistory={() => delivery.setTab("history")}
            />
          )}
          {delivery.tab === "history" && <HistoryView history={delivery.history} />}
          {delivery.tab === "settings" && (
            <SettingsView
              settings={delivery.settings}
              onUpdateSettings={delivery.updateSettings}
              isOnline={delivery.isOnline}
              onToggleOnline={() => delivery.setIsOnline((current) => !current)}
              onOpenHelp={delivery.openHelp}
              onOpenSafety={delivery.openSafety}
              onOpenReport={() => delivery.openReport()}
            />
          )}
          {delivery.tab === "notifications" && (
            <NotificationsView
              notifications={delivery.notifications}
              onBack={delivery.goBack}
              onMarkAsRead={delivery.markNotificationAsRead}
              onMarkAllAsRead={delivery.markAllNotificationsAsRead}
              onClearAll={delivery.clearNotifications}
            />
          )}
          {delivery.tab === "help" && (
            <HelpCenterView onBack={delivery.goBack} onOpenReport={() => delivery.openReport()} />
          )}
          {delivery.tab === "safety" && (
            <SafetyToolkitView
              onBack={delivery.goBack}
              isLiveTripShared={delivery.isLiveTripShared}
              onToggleLiveTrip={() => delivery.setIsLiveTripShared((p) => !p)}
              onOpenReport={() => delivery.openReport()}
            />
          )}
          {delivery.tab === "report" && (
            <ReportIssueView
              onBack={delivery.goBack}
              activeDelivery={delivery.activeDelivery}
              history={delivery.history}
              tickets={delivery.tickets}
              onSubmitTicket={delivery.submitTicket}
              preselectedOrderId={delivery.selectedReportOrderId}
              onOpenDashboard={() => delivery.setTab("dashboard")}
            />
          )}
        </section>
        <DeliveryNavigation activeTab={delivery.tab} onTabChange={delivery.setTab} />
      </main>
    </>
  );
}
