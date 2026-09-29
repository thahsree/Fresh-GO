"use client";

import { useDeliveryController } from "../controllers/useDeliveryController";
import { ActiveDeliveryView } from "./ActiveDeliveryView";
import { DashboardView } from "./DashboardView";
import { DeliveryHeader } from "./DeliveryHeader";
import { DeliveryLoginView } from "./DeliveryLoginView";
import { DeliveryNavigation } from "./DeliveryNavigation";
import { EarningsView } from "./EarningsView";
import { HelpCenterView } from "./HelpCenterView";
import { HistoryView } from "./HistoryView";
import { ReportIssueView } from "./ReportIssueView";
import { SafetyToolkitView } from "./SafetyToolkitView";
import { SettingsView } from "./SettingsView";
import { SplashScreen } from "./SplashScreen";

export function DeliveryApp() {
  const delivery = useDeliveryController();

  if (delivery.isLoading) {
    return null;
  }

  // If partner is not logged in, present real login view
  if (!delivery.user) {
    return <DeliveryLoginView onLoginSuccess={delivery.handleLoginSuccess} />;
  }

  return (
    <>
      <SplashScreen />
      <main className="delivery-shell">
        <DeliveryHeader
          isOnline={delivery.isOnline}
          onOpenSafety={delivery.openSafety}
          partnerName={delivery.user.name}
          hubName={delivery.selectedHub?.name || "Kozhikode Hub"}
          vehicleType={delivery.settings.vehicle}
        />

        <section className="delivery-content">
          {delivery.tab === "dashboard" && (
            <DashboardView
              isOnline={delivery.isOnline}
              request={delivery.request}
              availableOrdersCount={delivery.availableOrders.length}
              todayEarnings={delivery.todayEarnings}
              selectedHub={delivery.selectedHub}
              onAccept={delivery.acceptRequest}
              onDecline={delivery.declineRequest}
              onOpenHistory={() => delivery.setTab("history")}
              onOpenSettings={() => delivery.setTab("settings")}
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
              onOpenHistory={() => delivery.setTab("history")}
            />
          )}

          {delivery.tab === "history" && <HistoryView history={delivery.history} />}

          {delivery.tab === "settings" && (
            <SettingsView
              settings={delivery.settings}
              onUpdateSettings={delivery.updateSettings}
              isOnline={delivery.isOnline}
              onToggleOnline={delivery.toggleOnline}
              hubs={delivery.hubs}
              selectedHub={delivery.selectedHub}
              onChangeHub={delivery.changeHub}
              user={delivery.user}
              onLogout={delivery.logout}
              onOpenHelp={delivery.openHelp}
              onOpenSafety={delivery.openSafety}
              onOpenReport={() => delivery.openReport()}
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
