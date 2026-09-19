"use client";

import { useRouter } from "next/navigation";
import { HelpCenterView } from "../components/HelpCenterView";
import { DeliveryNavigation } from "../components/DeliveryNavigation";

export default function HelpPage() {
  const router = useRouter();

  return (
    <main className="delivery-shell">
      <section className="delivery-content">
        <HelpCenterView
          onBack={() => router.push("/")}
          onOpenReport={() => router.push("/report")}
        />
      </section>
      <DeliveryNavigation
        activeTab="help"
        onTabChange={() => router.push("/")}
      />
    </main>
  );
}
