"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Crosshair,
  ExternalLink,
  Flame,
  HeartHandshake,
  HelpCircle,
  Hospital,
  MapPin,
  Phone,
  PhoneCall,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Truck,
  Wrench,
  X,
} from "lucide-react";
import {
  initialInsurancePolicy,
  safetyHotlines,
} from "../models/delivery";

type SafetyToolkitViewProps = {
  onBack: () => void;
  isLiveTripShared: boolean;
  onToggleLiveTrip: () => void;
  onOpenReport?: () => void;
};

export function SafetyToolkitView({
  onBack,
  isLiveTripShared,
  onToggleLiveTrip,
  onOpenReport,
}: SafetyToolkitViewProps) {
  const [sosModalOpen, setSosModalOpen] = useState(false);
  const [sosTriggered, setSosTriggered] = useState(false);
  const [breakdownModalOpen, setBreakdownModalOpen] = useState(false);
  const [breakdownRequested, setBreakdownRequested] = useState(false);
  const [showHospitals, setShowHospitals] = useState(false);

  const hospitalsList = [
    { name: "Baby Memorial Hospital", distance: "2.4 km", area: "Indira Gandhi Road, Kozhikode", phone: "0495-2777777" },
    { name: "Aster MIMS Hospital", distance: "4.8 km", area: "Mini Bypass Road, Govindapuram", phone: "0495-2488000" },
    { name: "Govt Medical College Hospital", distance: "6.1 km", area: "Medical College PO", phone: "0495-2350216" },
  ];

  const handleTriggerSos = () => {
    setSosTriggered(true);
  };

  const handleRequestBreakdown = () => {
    setBreakdownRequested(true);
  };

  return (
    <div className="safety-view">
      {/* Header */}
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
        <div className="subpage-badge safety">24/7 Ride Protection</div>
      </div>

      <div className="view-heading compact">
        <span className="eyebrow safety-eyebrow">Safety & Security Toolkit</span>
        <h1>Safety Toolkit</h1>
        <p>
          Instant emergency response, live trip tracking, roadside breakdown help, and insurance protection.
        </p>
      </div>

      {/* SOS Hero Card */}
      <section className="card sos-hero-card">
        <div className="sos-badge-row">
          <span className="sos-live-pill">
            <span className="pulsing-dot" /> Live GPS Monitoring
          </span>
          <span className="zone-label">Zone 1 · Kozhikode</span>
        </div>
        <div className="sos-main">
          <div>
            <h2>Emergency SOS</h2>
            <p>
              In danger or in need of immediate help? One tap alerts police and our 24/7 safety response team with your live coordinates.
            </p>
          </div>
          <button
            type="button"
            className="sos-big-btn"
            onClick={() => setSosModalOpen(true)}
            aria-label="Activate Emergency SOS"
          >
            <ShieldAlert size={28} />
            <span>SOS</span>
          </button>
        </div>
      </section>

      {/* SOS Confirmation Modal */}
      {sosModalOpen && (
        <div className="sos-modal-overlay">
          <div className="sos-modal-card card">
            <div className="sos-modal-header">
              <div className="sos-alert-icon">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3>Emergency SOS Activation</h3>
                <p>Location: Mavoor Road, Kozhikode (11.2588° N, 75.7804° E)</p>
              </div>
              <button
                type="button"
                className="close-btn"
                onClick={() => {
                  setSosModalOpen(false);
                  setSosTriggered(false);
                }}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {sosTriggered ? (
              <div className="sos-triggered-state">
                <div className="sos-success-indicator">
                  <CheckCircle2 size={38} />
                </div>
                <h4>Emergency Alert Dispatched!</h4>
                <p>
                  Our Safety Command Desk has received your alert. A safety coordinator is calling you immediately on <strong>+91 98470 12044</strong>. Local patrol (112) is alerted.
                </p>
                <a href="tel:112" className="button button-danger-solid full-width">
                  <PhoneCall size={18} /> Direct Call 112 (Police)
                </a>
              </div>
            ) : (
              <div className="sos-prompt-state">
                <p className="sos-warning-text">
                  Only use this in real emergencies involving safety threats, severe accidents, or medical crises.
                </p>
                <div className="sos-modal-actions">
                  <button
                    type="button"
                    className="button button-danger-solid"
                    onClick={handleTriggerSos}
                  >
                    Confirm & Dispatch SOS
                  </button>
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => setSosModalOpen(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 1-Tap Emergency Hotlines */}
      <section className="safety-section">
        <div className="section-header-compact">
          <h2>Emergency Hotlines</h2>
          <span className="direct-badge">1-Tap Dial</span>
        </div>

        <div className="hotline-grid">
          {safetyHotlines.map((hotline) => (
            <div
              key={hotline.id}
              className={`card hotline-card ${hotline.urgent ? "urgent-card" : ""}`}
            >
              <div className="hotline-top">
                <span className={`hotline-badge ${hotline.urgent ? "urgent" : ""}`}>
                  {hotline.badge}
                </span>
                <span className="hotline-avail">{hotline.available}</span>
              </div>
              <div className="hotline-body">
                <strong>{hotline.title}</strong>
                <p>{hotline.description}</p>
              </div>
              <a
                href={`tel:${hotline.number.replace(/[^0-9+]/g, "")}`}
                className={`button ${hotline.urgent ? "button-danger-outline" : "button-secondary"}`}
              >
                <PhoneCall size={15} /> Dial {hotline.number}
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Live Trip Sharing */}
      <section className="card share-trip-card">
        <div className="share-trip-header">
          <div className="share-icon-wrap">
            <Share2 size={20} />
          </div>
          <div className="share-info">
            <strong>Share Live Trip with Family</strong>
            <p>Allow your trusted contact to see your live GPS location during deliveries.</p>
          </div>
          <button
            type="button"
            className={`switch ${isLiveTripShared ? "on" : ""}`}
            role="switch"
            aria-checked={isLiveTripShared}
            aria-label="Toggle live trip sharing"
            onClick={onToggleLiveTrip}
          >
            <i />
          </button>
        </div>

        <div className="trusted-contact-pill">
          <MapPin size={15} />
          <div>
            <span>Trusted Contact: <strong>Priya K. (Sister)</strong></span>
            <small>+91 94471 28910 · WhatsApp Live Tracking</small>
          </div>
          <span className={`status-tag ${isLiveTripShared ? "active" : "inactive"}`}>
            {isLiveTripShared ? "Sharing Active" : "Paused"}
          </span>
        </div>
      </section>

      {/* Roadside Breakdown & Towing Assistance */}
      <section className="card breakdown-card">
        <div className="breakdown-header">
          <div className="breakdown-icon">
            <Wrench size={20} />
          </div>
          <div className="breakdown-title">
            <h2>Two-Wheeler Roadside Help</h2>
            <p>Free puncture assistance, mechanical rescue, or towing to nearest service hub.</p>
          </div>
        </div>

        <div className="breakdown-features">
          <div className="feature-chip">
            <CheckCircle2 size={14} /> Puncture repair
          </div>
          <div className="feature-chip">
            <CheckCircle2 size={14} /> Towing within 15 km
          </div>
          <div className="feature-chip">
            <CheckCircle2 size={14} /> Battery jumpstart
          </div>
        </div>

        <div className="breakdown-actions">
          <button
            type="button"
            className="button button-primary full-width"
            onClick={() => setBreakdownModalOpen(true)}
          >
            <Truck size={17} /> Request Roadside Mechanic
          </button>
        </div>
      </section>

      {/* Roadside Breakdown Modal */}
      {breakdownModalOpen && (
        <div className="sos-modal-overlay">
          <div className="breakdown-modal-card card">
            <div className="sos-modal-header">
              <div className="tool-icon">
                <Wrench size={22} />
              </div>
              <div>
                <h3>Two-Wheeler Breakdown Assist</h3>
                <p>Kozhikode Partner Assistance Fleet</p>
              </div>
              <button
                type="button"
                className="close-btn"
                onClick={() => {
                  setBreakdownModalOpen(false);
                  setBreakdownRequested(false);
                }}
              >
                <X size={18} />
              </button>
            </div>

            {breakdownRequested ? (
              <div className="breakdown-confirmed">
                <div className="confirmed-badge">
                  <CheckCircle2 size={34} />
                </div>
                <h4>Mechanic Dispatched!</h4>
                <p>
                  Rider Support Mechanic <strong>Jamsheer K.</strong> is en route with mobile toolkit. ETA: <strong>14 mins</strong>.
                </p>
                <a href="tel:+919847012044" className="button button-primary full-width">
                  <PhoneCall size={16} /> Call Mechanic Direct
                </a>
              </div>
            ) : (
              <div className="breakdown-form">
                <p>Select your vehicle issue for swift dispatch:</p>
                <div className="issue-choices">
                  <button type="button" className="choice-pill active">
                    Flat Tyre / Puncture
                  </button>
                  <button type="button" className="choice-pill">
                    Engine / Belt Failure
                  </button>
                  <button type="button" className="choice-pill">
                    Minor Skid / Accident
                  </button>
                </div>
                <button
                  type="button"
                  className="button button-primary full-width"
                  onClick={handleRequestBreakdown}
                >
                  Confirm Dispatch to My Location
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Insurance Protection Card */}
      <section className="card insurance-card">
        <div className="insurance-top">
          <div className="insurance-shield-icon">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h2>Partner Accidental Insurance</h2>
            <span className="insurance-provider">{initialInsurancePolicy.provider}</span>
          </div>
          <span className="active-coverage-badge">Active</span>
        </div>

        <div className="insurance-metrics">
          <div className="metric-box">
            <span>Coverage Amount</span>
            <strong>{initialInsurancePolicy.coverageAmount}</strong>
            <small>Accidental & Disability</small>
          </div>
          <div className="metric-box">
            <span>Cashless Hospitals</span>
            <strong>{initialInsurancePolicy.cashlessHospitalCount}</strong>
            <small>Kozhikode Network</small>
          </div>
        </div>

        <div className="insurance-policy-meta">
          <div>
            <span>Policy Number</span>
            <strong>{initialInsurancePolicy.policyNumber}</strong>
          </div>
          <div>
            <span>Valid Until</span>
            <strong>{initialInsurancePolicy.validTill}</strong>
          </div>
        </div>

        <div className="insurance-actions">
          <button
            type="button"
            className="button button-secondary full-width"
            onClick={() => setShowHospitals((prev) => !prev)}
          >
            <Hospital size={16} />
            {showHospitals ? "Hide Nearby Hospitals" : "View Cashless Hospitals Nearby"}
          </button>
        </div>

        {showHospitals && (
          <div className="cashless-hospitals-drawer">
            <h4>Network Hospitals in Kozhikode</h4>
            {hospitalsList.map((hospital) => (
              <div key={hospital.name} className="hospital-item">
                <div>
                  <strong>{hospital.name}</strong>
                  <span>{hospital.area} · {hospital.distance}</span>
                </div>
                <a href={`tel:${hospital.phone}`} className="icon-btn-call" aria-label={`Call ${hospital.name}`}>
                  <Phone size={15} />
                </a>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Safety Guidelines */}
      <section className="card guidelines-card">
        <h3>Safe Riding Protocols</h3>
        <ul className="guidelines-list">
          <li>
            <CheckCircle2 size={16} />
            <span>Always wear ISI/DOT certified helmet strapped securely during shifts.</span>
          </li>
          <li>
            <CheckCircle2 size={16} />
            <span>Avoid holding phones in hand; use the handlebar waterproof shock mount.</span>
          </li>
          <li>
            <CheckCircle2 size={16} />
            <span>Use contactless drop option for late evening deliveries to unfamiliar addresses.</span>
          </li>
          <li>
            <CheckCircle2 size={16} />
            <span>Report hostile customer or security guard behavior immediately via Issue Report.</span>
          </li>
        </ul>
      </section>

      {/* Footer link to report an issue */}
      {onOpenReport && (
        <div className="safety-footer-action">
          <span>Encountered a safety incident or route hazard?</span>
          <button
            type="button"
            className="button button-secondary full-width"
            onClick={onOpenReport}
          >
            <AlertTriangle size={16} /> File Incident / Safety Report
          </button>
        </div>
      )}
    </div>
  );
}
