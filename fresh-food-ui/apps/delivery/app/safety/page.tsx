"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SafetyToolkitView } from "../components/SafetyToolkitView";
import { DeliveryNavigation } from "../components/DeliveryNavigation";

export default function SafetyPage() {
  const router = useRouter();
  const [isShared, setIsShared] = useState(false);

  return (
    <main className="delivery-shell">
      <section className="delivery-content">
        <SafetyToolkitView
          onBack={() => router.push("/")}
          isLiveTripShared={isShared}
          onToggleLiveTrip={() => setIsShared((p) => !p)}
          onOpenReport={() => router.push("/report")}
        />
      </section>
      <DeliveryNavigation
        activeTab="safety"
        onTabChange={() => router.push("/")}
      />
    </main>
  );
}
