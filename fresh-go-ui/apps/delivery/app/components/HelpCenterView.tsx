"use client";

import { useState, useMemo } from "react";
import {
  ArrowLeft,
  ChevronDown,
  HelpCircle,
  MessageCircle,
  PhoneCall,
  Search,
  ThumbsUp,
  X,
  AlertCircle,
  Clock,
  Wallet,
  ShieldAlert,
  UserCheck,
} from "lucide-react";
import { helpFaqs, HelpCategory } from "../models/delivery";

type HelpCenterViewProps = {
  onBack: () => void;
  onOpenReport?: () => void;
};

const categoryTabs: { id: HelpCategory; label: string; icon: typeof Clock }[] = [
  { id: "all", label: "All Topics", icon: HelpCircle },
  { id: "orders", label: "Orders & Delivery", icon: Clock },
  { id: "earnings", label: "Earnings & COD", icon: Wallet },
  { id: "account", label: "Account & Zone", icon: UserCheck },
  { id: "safety", label: "Safety & Emergencies", icon: ShieldAlert },
];

export function HelpCenterView({ onBack, onOpenReport }: HelpCenterViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<HelpCategory>("all");
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>("faq-1");
  const [helpfulFeedback, setHelpfulFeedback] = useState<Record<string, boolean>>({});
  const [chatOpened, setChatOpened] = useState(false);

  const filteredFaqs = useMemo(() => {
    return helpFaqs.filter((item) => {
      const matchesCategory =
        selectedCategory === "all" || item.category === selectedCategory;
      const query = searchQuery.trim().toLowerCase();
      if (!query) return matchesCategory;

      const matchesQuery =
        item.question.toLowerCase().includes(query) ||
        item.answer.toLowerCase().includes(query) ||
        item.tags.some((tag) => tag.toLowerCase().includes(query));

      return matchesCategory && matchesQuery;
    });
  }, [selectedCategory, searchQuery]);

  const toggleFaq = (id: string) => {
    setExpandedFaqId((curr) => (curr === id ? null : id));
  };

  const handleFeedback = (faqId: string, isHelpful: boolean) => {
    setHelpfulFeedback((prev) => ({ ...prev, [faqId]: isHelpful }));
  };

  return (
    <div className="help-view">
      {/* Top Header */}
      <div className="subpage-header">
        <button
          type="button"
          className="back-btn"
          onClick={onBack}
          aria-label="Go back to settings"
        >
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>
        <div className="subpage-badge">Partner Support</div>
      </div>

      <div className="view-heading compact">
        <span className="eyebrow">24/7 Delivery Partner Assistance</span>
        <h1>Help Centre</h1>
        <p>Instant answers to delivery questions, policies, and direct line to dispatch.</p>
      </div>

      {/* Quick Direct Support Channels */}
      <section className="card support-channels-card">
        <div className="support-channel-grid">
          <a
            href="tel:18004197233"
            className="channel-item call"
            aria-label="Call Partner Support"
          >
            <div className="channel-icon">
              <PhoneCall size={18} />
            </div>
            <div>
              <strong>Call Support</strong>
              <span>1800-419-7233 · Free</span>
            </div>
          </a>

          <button
            type="button"
            className="channel-item chat"
            onClick={() => setChatOpened(true)}
            aria-label="Live Chat with Dispatch"
          >
            <div className="channel-icon">
              <MessageCircle size={18} />
            </div>
            <div>
              <strong>Live Dispatch Chat</strong>
              <span>Response in ~2 mins</span>
            </div>
          </button>
        </div>
      </section>

      {/* Live Chat Drawer Modal */}
      {chatOpened && (
        <div className="live-chat-modal">
          <div className="chat-modal-content card">
            <div className="chat-modal-header">
              <div className="chat-agent-info">
                <span className="agent-status-dot" />
                <div>
                  <strong>Dispatch Support</strong>
                  <small>Kozhikode Central Desk · Active</small>
                </div>
              </div>
              <button
                type="button"
                className="close-btn"
                onClick={() => setChatOpened(false)}
                aria-label="Close Chat"
              >
                <X size={18} />
              </button>
            </div>
            <div className="chat-messages">
              <div className="chat-bubble support">
                Hello Arun! How can dispatch assist your delivery today? You can also report wait times or address issues instantly.
                <span className="chat-timestamp">Just now</span>
              </div>
            </div>
            <div className="chat-input-row">
              <input
                type="text"
                placeholder="Type your message to dispatch..."
                aria-label="Chat input"
              />
              <button type="button" className="button button-primary">
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="help-search-box">
        <Search size={18} className="search-icon" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search topics (e.g., store delay, COD, rain surge...)"
          aria-label="Search help topics"
        />
        {searchQuery && (
          <button
            type="button"
            className="clear-search"
            onClick={() => setSearchQuery("")}
            aria-label="Clear search"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Category Pills */}
      <div className="category-scroll-pills" role="tablist">
        {categoryTabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={selectedCategory === id}
            className={`pill-btn ${selectedCategory === id ? "active" : ""}`}
            onClick={() => setSelectedCategory(id)}
          >
            <Icon size={14} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* FAQ Accordion List */}
      <section className="faq-section">
        <div className="section-header-compact">
          <h2>Frequently Asked Questions</h2>
          <span className="faq-count">{filteredFaqs.length} articles</span>
        </div>

        {filteredFaqs.length === 0 ? (
          <div className="empty-faq-state card">
            <AlertCircle size={24} />
            <p>No help articles found for “{searchQuery}”.</p>
            <button
              type="button"
              className="text-action"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
              }}
            >
              Reset search filters
            </button>
          </div>
        ) : (
          <div className="faq-accordion-list">
            {filteredFaqs.map((faq) => {
              const isExpanded = expandedFaqId === faq.id;
              const feedback = helpfulFeedback[faq.id];
              return (
                <article
                  key={faq.id}
                  className={`faq-item card ${isExpanded ? "expanded" : ""}`}
                >
                  <button
                    type="button"
                    className="faq-question-btn"
                    onClick={() => toggleFaq(faq.id)}
                    aria-expanded={isExpanded}
                  >
                    <span className="faq-question-text">{faq.question}</span>
                    <ChevronDown
                      size={17}
                      className={`faq-chevron ${isExpanded ? "rotated" : ""}`}
                    />
                  </button>

                  {isExpanded && (
                    <div className="faq-answer-body">
                      <p>{faq.answer}</p>
                      <div className="faq-tags-row">
                        {faq.tags.map((tag) => (
                          <span key={tag} className="faq-tag">
                            #{tag}
                          </span>
                        ))}
                      </div>
                      <div className="faq-feedback-row">
                        <span>Was this helpful?</span>
                        <div className="feedback-buttons">
                          <button
                            type="button"
                            className={`feedback-btn ${feedback === true ? "voted" : ""}`}
                            onClick={() => handleFeedback(faq.id, true)}
                          >
                            <ThumbsUp size={13} /> Yes
                          </button>
                          <button
                            type="button"
                            className={`feedback-btn ${feedback === false ? "voted" : ""}`}
                            onClick={() => handleFeedback(faq.id, false)}
                          >
                            No
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Still Need Assistance Banner */}
      <section className="card still-need-help-card">
        <div className="need-help-content">
          <h3>Issue not listed here?</h3>
          <p>
            Submit an official ticket or report an incident directly to get compensation
            and dispatch intervention.
          </p>
          {onOpenReport && (
            <button
              type="button"
              className="button button-primary"
              onClick={onOpenReport}
            >
              Report an Issue Now
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
