"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  Clock,
  FileCheck2,
  HelpCircle,
  Image as ImageIcon,
  MapPin,
  PhoneCall,
  PlusCircle,
  Send,
  Sparkles,
  Store,
  Upload,
  User,
  Wrench,
  X,
} from "lucide-react";
import {
  ActiveDelivery,
  DeliveryHistoryItem,
  issueCategoryOptions,
  IssueCategory,
  IssuePriority,
  IssueTicket,
} from "../models/delivery";

type ReportIssueViewProps = {
  onBack: () => void;
  activeDelivery: ActiveDelivery | null;
  history: DeliveryHistoryItem[];
  tickets: IssueTicket[];
  onSubmitTicket: (ticket: Omit<IssueTicket, "id" | "createdAt" | "status" | "resolutionNote">) => IssueTicket;
  preselectedOrderId?: string;
  onOpenDashboard: () => void;
};

export function ReportIssueView({
  onBack,
  activeDelivery,
  history,
  tickets,
  onSubmitTicket,
  preselectedOrderId,
  onOpenDashboard,
}: ReportIssueViewProps) {
  const [activeTab, setActiveTab] = useState<"form" | "tickets">("form");

  const [selectedOrderId, setSelectedOrderId] = useState<string>(
    preselectedOrderId || (activeDelivery ? activeDelivery.id : "none")
  );
  const [selectedCategory, setSelectedCategory] = useState<IssueCategory>("store_delay");
  const [priority, setPriority] = useState<IssuePriority>("urgent");
  const [description, setDescription] = useState("");
  const [callbackRequested, setCallbackRequested] = useState(true);
  const [attachedPhoto, setAttachedPhoto] = useState<string | null>(null);

  const [submittedTicket, setSubmittedTicket] = useState<IssueTicket | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableOrders = [
    ...(activeDelivery
      ? [{ id: activeDelivery.id, label: `Active: #${activeDelivery.id} · ${activeDelivery.customer}`, tag: "Active Run" }]
      : []),
    ...history.slice(0, 3).map((item) => ({
      id: item.id,
      label: `Delivered: #${item.id} · ${item.customer} (${item.area})`,
      tag: item.completedAt,
    })),
    { id: "none", label: "General issue (not related to a specific order)", tag: "General" },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setIsSubmitting(true);
    const categoryInfo = issueCategoryOptions.find((c) => c.id === selectedCategory);

    setTimeout(() => {
      const ticket = onSubmitTicket({
        orderId: selectedOrderId === "none" ? undefined : selectedOrderId,
        category: selectedCategory,
        categoryLabel: categoryInfo?.label || "General Issue",
        priority,
        description: description.trim(),
      });
      setIsSubmitting(false);
      setSubmittedTicket(ticket);
    }, 450);
  };

  const handleResetForm = () => {
    setSubmittedTicket(null);
    setDescription("");
    setAttachedPhoto(null);
    setActiveTab("form");
  };

  return (
    <div className="report-view">
      {/* Subpage Header */}
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
        <div className="subpage-badge report">Partner Resolution Desk</div>
      </div>

      <div className="view-heading compact">
        <span className="eyebrow">Support & Escalations</span>
        <h1>Report an Issue</h1>
        <p>
          Fast resolution for store delays, customer unreachability, payment discrepancies, or app problems.
        </p>
      </div>

      {/* Mode Switcher: Form vs Past Tickets */}
      <div className="report-mode-switch">
        <button
          type="button"
          className={`mode-btn ${activeTab === "form" ? "active" : ""}`}
          onClick={() => setActiveTab("form")}
        >
          <PlusCircle size={15} />
          <span>File New Issue</span>
        </button>
        <button
          type="button"
          className={`mode-btn ${activeTab === "tickets" ? "active" : ""}`}
          onClick={() => setActiveTab("tickets")}
        >
          <FileCheck2 size={15} />
          <span>My Tickets ({tickets.length})</span>
        </button>
      </div>

      {activeTab === "tickets" ? (
        /* My Tickets History View */
        <section className="tickets-list-section">
          <div className="section-header-compact">
            <h2>Recent Issue Tickets</h2>
            <span className="faq-count">{tickets.length} submitted</span>
          </div>

          {tickets.length === 0 ? (
            <div className="card empty-faq-state">
              <CheckCircle2 size={32} />
              <p>No issue reports filed. Safe rides!</p>
            </div>
          ) : (
            <div className="tickets-stack">
              {tickets.map((ticket) => (
                <article key={ticket.id} className="card ticket-card">
                  <div className="ticket-header">
                    <div className="ticket-meta">
                      <span className="ticket-id">{ticket.id}</span>
                      {ticket.orderId && (
                        <span className="ticket-order-tag">Order #{ticket.orderId}</span>
                      )}
                    </div>
                    <span className={`status-badge-chip ${ticket.status}`}>
                      {ticket.status === "resolved" ? "Resolved" : "Under Review"}
                    </span>
                  </div>

                  <h3 className="ticket-category-title">{ticket.categoryLabel}</h3>
                  <p className="ticket-description">{ticket.description}</p>

                  <div className="ticket-footer-row">
                    <span className="ticket-timestamp">
                      <Clock size={12} /> {ticket.createdAt}
                    </span>
                    <span className={`priority-indicator ${ticket.priority}`}>
                      {ticket.priority.toUpperCase()}
                    </span>
                  </div>

                  {ticket.resolutionNote && (
                    <div className="ticket-resolution-box">
                      <strong>Resolution Note:</strong>
                      <p>{ticket.resolutionNote}</p>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      ) : submittedTicket ? (
        /* Ticket Submitted Confirmation View */
        <section className="card ticket-success-card">
          <div className="success-icon-wrap">
            <CheckCircle2 size={44} />
          </div>
          <h2>Ticket #{submittedTicket.id} Submitted!</h2>
          <p className="success-sub">
            Your incident has been routed to the <strong>Kozhikode Dispatch Operations Desk</strong>.
          </p>

          <div className="ticket-summary-box">
            <div className="summary-row">
              <span>Category</span>
              <strong>{submittedTicket.categoryLabel}</strong>
            </div>
            {submittedTicket.orderId && (
              <div className="summary-row">
                <span>Associated Order</span>
                <strong>#{submittedTicket.orderId}</strong>
              </div>
            )}
            <div className="summary-row">
              <span>Priority SLA</span>
              <strong className="accent-text">Response within 10-15 mins</strong>
            </div>
            <div className="summary-row">
              <span>Status</span>
              <span className="status-badge-chip under_review">Under Review</span>
            </div>
          </div>

          <div className="success-notice">
            <Sparkles size={16} />
            <span>
              Any store wait-time or detour compensation will be automatically credited to your Earnings dashboard upon verification.
            </span>
          </div>

          <div className="split-actions">
            <button
              type="button"
              className="button button-secondary"
              onClick={handleResetForm}
            >
              File Another Report
            </button>
            <button
              type="button"
              className="button button-primary"
              onClick={() => setActiveTab("tickets")}
            >
              View Ticket Status
            </button>
          </div>
        </section>
      ) : (
        /* File New Issue Form */
        <form onSubmit={handleSubmit} className="report-form">
          {/* Step 1: Order Selector */}
          <section className="card form-step-card">
            <div className="form-section-title">
              <span className="step-num">1</span>
              <div>
                <h2>Select Order Involved</h2>
                <p>Link this report to an active or recent delivery trip</p>
              </div>
            </div>

            <div className="order-radio-group">
              {availableOrders.map((ord) => (
                <label
                  key={ord.id}
                  className={`order-radio-card ${selectedOrderId === ord.id ? "selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="orderSelection"
                    value={ord.id}
                    checked={selectedOrderId === ord.id}
                    onChange={() => setSelectedOrderId(ord.id)}
                  />
                  <div className="radio-content">
                    <span className="radio-label">{ord.label}</span>
                    <span className="radio-tag">{ord.tag}</span>
                  </div>
                </label>
              ))}
            </div>
          </section>

          {/* Step 2: Issue Category */}
          <section className="card form-step-card">
            <div className="form-section-title">
              <span className="step-num">2</span>
              <div>
                <h2>What is the issue?</h2>
                <p>Pick the category that best matches your situation</p>
              </div>
            </div>

            <div className="category-choice-grid">
              {issueCategoryOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`category-select-card ${selectedCategory === opt.id ? "active" : ""}`}
                  onClick={() => setSelectedCategory(opt.id)}
                >
                  <div className="cat-card-header">
                    <strong>{opt.label}</strong>
                  </div>
                  <small>{opt.hint}</small>
                </button>
              ))}
            </div>
          </section>

          {/* Step 3: Priority & Urgency */}
          <section className="card form-step-card">
            <div className="form-section-title">
              <span className="step-num">3</span>
              <div>
                <h2>Urgency Level</h2>
                <p>Determines dispatcher escalation speed</p>
              </div>
            </div>

            <div className="priority-pill-selector">
              {(["normal", "urgent", "critical"] as IssuePriority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`priority-pill ${priority === p ? `active ${p}` : ""}`}
                  onClick={() => setPriority(p)}
                >
                  {p === "normal" && "Normal (Query)"}
                  {p === "urgent" && "Urgent (Trip Impacted)"}
                  {p === "critical" && "Critical (Emergency / Stuck)"}
                </button>
              ))}
            </div>
          </section>

          {/* Step 4: Issue Description */}
          <section className="card form-step-card">
            <div className="form-section-title">
              <span className="step-num">4</span>
              <div>
                <h2>Describe What Happened</h2>
                <p>Provide details so dispatch can resolve without delay</p>
              </div>
            </div>

            <div className="textarea-wrap">
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Example: Arrived at Fresh Food Hub 15 minutes ago. Merchant says items are still being packed. Kitchen coordinator informed delay will be another 10 minutes..."
                required
                aria-label="Issue description"
              />
              <div className="textarea-footer">
                <span className="char-count">{description.length} characters</span>
                {description.length < 15 && (
                  <span className="hint-warning">Please enter at least 15 characters</span>
                )}
              </div>
            </div>

            {/* Simulated Photo Attachment */}
            <div className="photo-attachment-zone">
              {attachedPhoto ? (
                <div className="attached-preview">
                  <div className="preview-indicator">
                    <ImageIcon size={18} />
                    <span>Photo attached: {attachedPhoto}</span>
                  </div>
                  <button
                    type="button"
                    className="remove-photo-btn"
                    onClick={() => setAttachedPhoto(null)}
                    aria-label="Remove photo"
                  >
                    <X size={15} />
                  </button>
                </div>
              ) : (
                <div className="attachment-triggers">
                  <button
                    type="button"
                    className="attach-btn"
                    onClick={() => setAttachedPhoto("store_receipt_photo.jpg")}
                  >
                    <Camera size={16} /> Attach Bill / Store Photo
                  </button>
                  <button
                    type="button"
                    className="attach-btn"
                    onClick={() => setAttachedPhoto("damaged_package.jpg")}
                  >
                    <Upload size={16} /> Attach Spill / Package Photo
                  </button>
                </div>
              )}
            </div>

            {/* Dispatch Callback Toggle */}
            <div className="callback-preference-row">
              <div>
                <strong>Request Dispatch Call-Back</strong>
                <span>Have a coordinator phone you within 10 minutes</span>
              </div>
              <button
                type="button"
                className={`switch ${callbackRequested ? "on" : ""}`}
                role="switch"
                aria-checked={callbackRequested}
                aria-label="Request callback"
                onClick={() => setCallbackRequested((prev) => !prev)}
              >
                <i />
              </button>
            </div>
          </section>

          {/* Submit Action */}
          <div className="form-submit-actions">
            <button
              type="submit"
              disabled={isSubmitting || description.trim().length < 10}
              className="button button-primary full-width"
            >
              {isSubmitting ? (
                "Submitting Report..."
              ) : (
                <>
                  <Send size={16} /> Submit Incident Report
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
