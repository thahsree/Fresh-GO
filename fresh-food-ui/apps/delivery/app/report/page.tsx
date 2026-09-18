"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ReportIssueView } from "../components/ReportIssueView";
import { DeliveryNavigation } from "../components/DeliveryNavigation";
import { initialHistory, initialTickets, IssueTicket, pendingRequest } from "../models/delivery";

export default function ReportPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<IssueTicket[]>(initialTickets);

  const handleSubmitTicket = (
    data: Omit<IssueTicket, "id" | "createdAt" | "status" | "resolutionNote">
  ) => {
    const newTicket: IssueTicket = {
      ...data,
      id: `TK-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: "Just now",
      status: "under_review",
    };
    setTickets((prev) => [newTicket, ...prev]);
    return newTicket;
  };

  return (
    <main className="delivery-shell">
      <section className="delivery-content">
        <ReportIssueView
          onBack={() => router.push("/")}
          activeDelivery={{ ...pendingRequest, phase: "accepted" }}
          history={initialHistory}
          tickets={tickets}
          onSubmitTicket={handleSubmitTicket}
          onOpenDashboard={() => router.push("/")}
        />
      </section>
      <DeliveryNavigation
        activeTab="report"
        onTabChange={() => router.push("/")}
      />
    </main>
  );
}
