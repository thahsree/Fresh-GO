export type DeliveryTab =
  | "dashboard"
  | "active"
  | "earnings"
  | "history"
  | "settings"
  | "help"
  | "safety"
  | "report";

export type DeliveryPhase = "accepted" | "at-pickup" | "on-the-way";
export type HistoryStatus = "Delivered" | "Cancelled";

export type DeliveryRequest = {
  id: string;
  orderNumber?: string;
  customer: string;
  customerPhone?: string;
  pickup: string;
  pickupAddress: string;
  dropAddress: string;
  instructions: string;
  payment: string;
  distance: string;
  distanceKm?: number;
  eta: string;
  earnings: number;
  items: number;
  hubId?: string;
  status?: string;
  itemsSummary?: string;
};

export type ActiveDelivery = DeliveryRequest & {
  phase: DeliveryPhase;
  tripId?: string;
};

export type DeliveryHistoryItem = {
  id: string;
  orderNumber?: string;
  customer: string;
  area: string;
  completedAt: string;
  distance: string;
  earnings: number;
  status: HistoryStatus;
};

export type AlertSoundType =
  | "chime"
  | "urgent_pulse"
  | "radar_ping"
  | "bell_ring"
  | "marimba";

export type DeliverySettings = {
  vehicle: "Bike" | "Scooter";
  preferredZone: string;
  selectedHubId?: string;
  soundAlerts?: boolean;
  alertSound?: AlertSoundType;
};

export const defaultSettings: DeliverySettings = {
  vehicle: "Bike",
  preferredZone: "Kozhikode Central",
  soundAlerts: true,
  alertSound: "chime",
};

export type HelpCategory = "all" | "orders" | "earnings" | "account" | "safety";

export type HelpFaqItem = {
  id: string;
  category: HelpCategory;
  question: string;
  answer: string;
  tags: string[];
};

export const helpFaqs: HelpFaqItem[] = [
  {
    id: "faq-1",
    category: "orders",
    question: "What should I do if the hub kitchen takes more than 15 minutes to hand over the order?",
    answer: "Wait time past 10 minutes qualifies for auto-compensation (Rs 3.5 per minute). If wait exceeds 15 minutes, tap 'Report an issue' > 'Store delay'. Our dispatch coordinator will contact the store directly.",
    tags: ["store delay", "wait time", "merchant", "compensation"],
  },
  {
    id: "faq-2",
    category: "orders",
    question: "Customer is unreachable at the drop location. What is the standard protocol?",
    answer: "1. Call the customer at least twice through the app. 2. Ring the doorbell or check with building security. 3. If unreachable after 7 minutes, tap 'Report an issue' > 'Customer unreachable'. Customer support will initiate an emergency auto-call.",
    tags: ["unreachable", "customer", "calling", "drop location"],
  },
  {
    id: "faq-3",
    category: "earnings",
    question: "How and when are Cash on Delivery (COD) amounts reconciled?",
    answer: "COD cash collected is automatically reconciled with your daily balance. If your COD cash exceeds Rs 50,000, please deposit it at your fulfillment hub before accepting subsequent orders.",
    tags: ["cod", "cash", "deposit", "settlement"],
  },
  {
    id: "faq-4",
    category: "earnings",
    question: "When are delivery earnings credited?",
    answer: "Delivery base pay (Rs 45 + Rs 12/km) is calculated and credited instantly upon completing the delivery handoff. Weekly payouts are disbursed every Tuesday morning.",
    tags: ["incentives", "earnings", "payout", "bonus"],
  },
  {
    id: "faq-5",
    category: "account",
    question: "How do I change my assigned fulfillment hub?",
    answer: "Go to Settings > Fulfillment Hub Selection and tap any active hub. You will immediately start receiving delivery orders originating from that hub.",
    tags: ["hub", "settings", "assignment", "fulfillment"],
  },
  {
    id: "faq-6",
    category: "safety",
    question: "What emergency protection is provided during delivery runs?",
    answer: "FreshGo delivery partners are insured up to Rs 5,00,000 for accidental hospitalization. You can trigger the Safety Toolkit's 24/7 SOS desk anytime for on-road assistance, ambulance dispatch, or police support.",
    tags: ["emergency", "sos", "insurance", "towing", "hospitalization"],
  },
];

export type SafetyHotline = {
  id: string;
  title: string;
  number: string;
  available: string;
  description: string;
  badge: string;
  urgent?: boolean;
};

export const safetyHotlines: SafetyHotline[] = [
  {
    id: "police",
    title: "National Emergency / Police",
    number: "112",
    available: "24/7 Immediate",
    description: "For immediate safety threats, accidents, or criminal emergencies.",
    badge: "Government 112",
    urgent: true,
  },
  {
    id: "ambulance",
    title: "Emergency Ambulance Service",
    number: "108",
    available: "24/7 Rapid Response",
    description: "Paramedic response and trauma care transport across Kerala.",
    badge: "Medical 108",
    urgent: true,
  },
  {
    id: "freshfood-sos",
    title: "FreshGo Partner Safety Desk",
    number: "1800-419-7233",
    available: "24/7 Dedicated",
    description: "Direct line to our safety control room, live tracking & ground assistance.",
    badge: "Partner Helpline",
  },
  {
    id: "roadside",
    title: "Two-Wheeler Roadside & Towing",
    number: "+91 98470 12044",
    available: "7:00 AM – 11:30 PM",
    description: "Free puncture repair and towing to nearest hub within 15 km.",
    badge: "Breakdown Support",
  },
];

export type InsurancePolicy = {
  policyNumber: string;
  provider: string;
  coverageAmount: string;
  validTill: string;
  cashlessHospitalCount: number;
  partnerId: string;
};

export const defaultInsurancePolicy: InsurancePolicy = {
  policyNumber: "FG-GI-2026-89410",
  provider: "Star Health & FreshGo Group Shield",
  coverageAmount: "₹ 5,00,000",
  validTill: "31 Dec 2026",
  cashlessHospitalCount: 42,
  partnerId: "FG-DP-PARTNER",
};
export const initialInsurancePolicy = defaultInsurancePolicy;

export type IssueCategory =
  | "store_delay"
  | "customer_unreachable"
  | "wrong_address"
  | "damaged_food"
  | "payment_cod"
  | "vehicle_breakdown"
  | "app_glitch";

export type IssuePriority = "normal" | "urgent" | "critical";

export type IssueTicket = {
  id: string;
  orderId?: string;
  category: IssueCategory;
  categoryLabel: string;
  priority: IssuePriority;
  description: string;
  createdAt: string;
  status: "under_review" | "in_progress" | "resolved";
  resolutionNote?: string;
};

export const issueCategoryOptions: { id: IssueCategory; label: string; iconName: string; hint: string }[] = [
  { id: "store_delay", label: "Hub store / packing delay > 15m", iconName: "Store", hint: "Order meat or seafood is still being cut or packed" },
  { id: "customer_unreachable", label: "Customer unreachable / Door locked", iconName: "PhoneOff", hint: "No response after multiple calls and doorbell" },
  { id: "wrong_address", label: "Wrong address / Map pin error", iconName: "MapPinOff", hint: "Drop pin is misleading or road is closed" },
  { id: "damaged_food", label: "Damaged / Broken cold-seal packaging", iconName: "AlertTriangle", hint: "Cold-chain box or vacuum pack compromised" },
  { id: "payment_cod", label: "COD or Payment dispute", iconName: "Banknote", hint: "Customer short-paid or refuses cash on delivery" },
  { id: "vehicle_breakdown", label: "Vehicle breakdown / Accident", iconName: "Wrench", hint: "Puncture, mechanical failure, or road incident" },
  { id: "app_glitch", label: "App error / GPS not tracking", iconName: "SmartphoneAlert", hint: "Unable to swipe status or map frozen" },
];
