export type DeliveryTab =
  | "dashboard"
  | "active"
  | "earnings"
  | "history"
  | "settings"
  | "help"
  | "safety"
  | "report"
  | "notifications";

export type DeliveryPhase = "accepted" | "at-pickup" | "on-the-way";
export type HistoryStatus = "Delivered" | "Cancelled";

export type DeliveryRequest = {
  id: string;
  customer: string;
  pickup: string;
  pickupAddress: string;
  dropAddress: string;
  instructions: string;
  payment: string;
  distance: string;
  eta: string;
  earnings: number;
  items: number;
};

export type ActiveDelivery = DeliveryRequest & {
  phase: DeliveryPhase;
};

export type DeliveryHistoryItem = {
  id: string;
  customer: string;
  area: string;
  completedAt: string;
  distance: string;
  earnings: number;
  status: HistoryStatus;
};

export type DeliverySettings = {
  orderAlerts: boolean;
  earningsAlerts: boolean;
  soundAlerts: boolean;
  vehicle: "Bike" | "Scooter";
  preferredZone: string;
};

export const pendingRequest: DeliveryRequest = {
  id: "FF10286",
  customer: "Thashreef R.",
  pickup: "Fresh GO Hub",
  pickupAddress: "Mavoor Road, Kozhikode",
  dropAddress: "Palm Residency, Flat 4B, Kottooli",
  instructions: "Call before arriving",
  payment: "COD · Rs 890",
  distance: "3.2 km",
  eta: "18 min",
  earnings: 92,
  items: 5,
};

export const initialHistory: DeliveryHistoryItem[] = [
  { id: "FF10282", customer: "Fathima N.", area: "Nadakkavu", completedAt: "Today, 11:42 AM", distance: "2.6 km", earnings: 76, status: "Delivered" },
  { id: "FF10278", customer: "Nihal P.", area: "Vellimadukunnu", completedAt: "Today, 10:18 AM", distance: "4.1 km", earnings: 108, status: "Delivered" },
  { id: "FF10264", customer: "Sara M.", area: "Medical College", completedAt: "Yesterday, 6:05 PM", distance: "3.5 km", earnings: 0, status: "Cancelled" },
  { id: "FF10251", customer: "Mohammed A.", area: "Eranhipalam", completedAt: "Yesterday, 4:31 PM", distance: "2.2 km", earnings: 68, status: "Delivered" },
];

export const weeklyEarnings = [
  { day: "Mon", amount: 860 },
  { day: "Tue", amount: 940 },
  { day: "Wed", amount: 720 },
  { day: "Thu", amount: 1010 },
  { day: "Fri", amount: 1120 },
  { day: "Sat", amount: 1090 },
  { day: "Sun", amount: 1100 },
];

export const initialSettings: DeliverySettings = {
  orderAlerts: true,
  earningsAlerts: true,
  soundAlerts: false,
  vehicle: "Bike",
  preferredZone: "Zone 1 · Kozhikode Central",
};

export type NotificationCategory = "incentive" | "payout" | "order" | "safety" | "system";

export type DeliveryNotification = {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  category: NotificationCategory;
  isRead: boolean;
  actionLabel?: string;
};

export const initialNotifications: DeliveryNotification[] = [
  {
    id: "notif-1",
    title: "Rain Surge Active · +₹35/drop",
    message: "Earn an extra ₹35 per order across Kozhikode Central. Heavy evening demand active till 11:00 PM.",
    timestamp: "10m ago",
    category: "incentive",
    isRead: false,
    actionLabel: "View Map",
  },
  {
    id: "notif-2",
    title: "Weekly Payout Transferred",
    message: "₹6,840 for the cycle Mar 10 – Mar 16 has been credited to your HDFC bank account (ending in 4821).",
    timestamp: "2h ago",
    category: "payout",
    isRead: false,
    actionLabel: "View Earnings",
  },
  {
    id: "notif-3",
    title: "Safety Toolkit: 24/7 SOS Desk Live",
    message: "Direct emergency dispatch, police (112), and ambulance (108) hotlines are now accessible directly from your header.",
    timestamp: "Yesterday",
    category: "safety",
    isRead: true,
    actionLabel: "Open Safety",
  },
  {
    id: "notif-4",
    title: "Milestone Incentive Unlocked",
    message: "You've successfully completed 15 deliveries this week! An extra ₹500 bonus will be included in your Tuesday payout.",
    timestamp: "2d ago",
    category: "incentive",
    isRead: true,
  },
  {
    id: "notif-5",
    title: "High Demand Zone Alert",
    message: "Order surge predicted near Mavoor Road Hub between 7:00 PM and 10:00 PM tonight. Head over to maximize orders.",
    timestamp: "3d ago",
    category: "order",
    isRead: true,
  },
];

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
    question: "What should I do if the merchant takes more than 15 minutes to hand over the order?",
    answer: "Wait time past 10 minutes qualifies for auto-compensation (Rs 3.5 per minute). If wait exceeds 15 minutes, tap 'Report an issue' > 'Store delay'. Our dispatch coordinator will contact the kitchen directly while your wait-time buffer starts recording.",
    tags: ["store delay", "wait time", "merchant", "compensation"],
  },
  {
    id: "faq-2",
    category: "orders",
    question: "Customer is unreachable at the drop location. What is the standard protocol?",
    answer: "1. Call the customer at least twice through the app masking number. 2. Ring the doorbell or check with building security if allowed. 3. If unreachable after 7 minutes, tap 'Report an issue' > 'Customer unreachable'. The customer support team will initiate an emergency auto-call before permitting return to hub.",
    tags: ["unreachable", "customer", "calling", "drop location"],
  },
  {
    id: "faq-3",
    category: "earnings",
    question: "How and when are Cash on Delivery (COD) amounts reconciled?",
    answer: "COD cash collected is automatically reconciled with your daily payout balance. If your COD cash exceeds Rs 2,500, please deposit it via UPI instant settlement in the app before accepting subsequent orders.",
    tags: ["cod", "cash", "deposit", "settlement"],
  },
  {
    id: "faq-4",
    category: "earnings",
    question: "When are weekly incentives and rainy day peak surges credited?",
    answer: "Milestone trip incentives (e.g. 25 deliveries/week) are credited every Tuesday morning directly into your linked bank account. Bad weather / rain surges (Rs 20-40 extra per order) are updated in real-time in your Earnings tab.",
    tags: ["incentives", "rain surge", "weekly payout", "bonus"],
  },
  {
    id: "faq-5",
    category: "account",
    question: "How do I update my delivery vehicle or preferred delivery zone?",
    answer: "You can change your vehicle type (Bike, Scooter) instantly in Settings > Work Preferences. For delivery zone transfers (e.g., Kozhikode Central to South Hub), submit a zone change request through 'Report an issue' > 'Account update'.",
    tags: ["vehicle", "zone change", "preferences", "hub"],
  },
  {
    id: "faq-6",
    category: "safety",
    question: "What emergency protection is provided during evening or rainy runs?",
    answer: "Fresh Food partners are insured up to Rs 5,00,000 for accidental hospitalization. You can trigger the Safety Toolkit's 24/7 SOS desk anytime for on-road assistance, ambulance dispatch, or free two-wheeler towing within Kozhikode district.",
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
    title: "Fresh Food Partner Safety Desk",
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

export const initialInsurancePolicy: InsurancePolicy = {
  policyNumber: "FF-GI-2026-89410",
  provider: "Star Health & Fresh Food Group Shield",
  coverageAmount: "₹ 5,00,000",
  validTill: "31 Dec 2026",
  cashlessHospitalCount: 42,
  partnerId: "FF-DP-214",
};

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
  { id: "store_delay", label: "Store / Kitchen delay > 15m", iconName: "Store", hint: "Order food is still not packed or ready" },
  { id: "customer_unreachable", label: "Customer unreachable / Door locked", iconName: "PhoneOff", hint: "No response after multiple calls and doorbell" },
  { id: "wrong_address", label: "Wrong address / Map pin error", iconName: "MapPinOff", hint: "Drop pin is misleading or road is closed" },
  { id: "damaged_food", label: "Damaged / Spilled packaging", iconName: "AlertTriangle", hint: "Spill or damage discovered during transit" },
  { id: "payment_cod", label: "COD or Payment dispute", iconName: "Banknote", hint: "Customer short-paid or refuses cash on delivery" },
  { id: "vehicle_breakdown", label: "Vehicle breakdown / Accident", iconName: "Wrench", hint: "Puncture, mechanical failure, or road incident" },
  { id: "app_glitch", label: "App error / GPS not tracking", iconName: "SmartphoneAlert", hint: "Unable to swipe status or map frozen" },
];

export const initialTickets: IssueTicket[] = [
  {
    id: "TK-8421",
    orderId: "FF10278",
    category: "store_delay",
    categoryLabel: "Store / Kitchen delay > 15m",
    priority: "urgent",
    description: "Waited 22 minutes at Fresh Food Hub Mavoor Road for vegetable salad packaging.",
    createdAt: "Today, 10:45 AM",
    status: "resolved",
    resolutionNote: "Auto-delay compensation of ₹ 42 approved and credited to today's earnings.",
  },
  {
    id: "TK-8390",
    orderId: "FF10264",
    category: "customer_unreachable",
    categoryLabel: "Customer unreachable / Door locked",
    priority: "urgent",
    description: "Customer phone switched off at Medical College quarter. Waited 8 minutes at gate.",
    createdAt: "Yesterday, 6:15 PM",
    status: "resolved",
    resolutionNote: "Trip marked as cancelled by support. Full trip payout of ₹ 70 credited.",
  },
];

