"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Bike,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Lock,
  Phone,
  Sparkles,
  MapPin,
  Upload,
  User,
  AlertCircle,
  FileText,
  Building,
  KeyRound,
  Eye,
  EyeOff,
} from "lucide-react";
import { deliveryApi, DeliveryUser, DeliveryHub } from "../lib/api";

// Active production hubs fallback to ensure dropdown is never empty on load or network delay
const DEFAULT_HUBS: DeliveryHub[] = [
  {
    id: "617cefa1-7e0d-45f3-bcbc-8ec475c441ff",
    name: "FreshGo Central Hub (Mavoor Road)",
    code: "HUB-CLT-01",
    city: "Kozhikode",
    address: "Mavoor Road, Kozhikode, Kerala 673004",
    latitude: 11.2588,
    longitude: 75.7804,
    deliveryRadiusKm: 10,
    isActive: true,
  },
  {
    id: "e47af570-4f31-445e-8e1d-39d82ddb6139",
    name: "Kannur Hub",
    code: "HUB-CLT-02",
    city: "Kannur",
    address: "Caltex, Talap, Kannur, Kerala 670004",
    latitude: 11.914047,
    longitude: 75.468638,
    deliveryRadiusKm: 15,
    isActive: true,
  },
];

type DeliveryLoginViewProps = {
  onLoginSuccess: (user: DeliveryUser) => void;
};

export function DeliveryLoginView({ onLoginSuccess }: DeliveryLoginViewProps) {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");

  // Sign In state
  const [phone, setPhone] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [showPartnerId, setShowPartnerId] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Application / Transfer state
  const [name, setName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [availableHubs, setAvailableHubs] = useState<DeliveryHub[]>(DEFAULT_HUBS);
  const [selectedHubId, setSelectedHubId] = useState<string>(DEFAULT_HUBS[0].id);
  const [isHubDropdownOpen, setIsHubDropdownOpen] = useState(false);
  const hubDropdownRef = useRef<HTMLDivElement>(null);
  const [vehicleType, setVehicleType] = useState("Bike");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [licensePhoto, setLicensePhoto] = useState<string | null>(null);
  const [licensePhotoName, setLicensePhotoName] = useState<string | null>(null);

  // Submission result state
  const [applicationSuccess, setApplicationSuccess] = useState<{
    hubName: string;
    hubAddress?: string;
    instructions: string;
  } | null>(null);

  // Fetch hubs on mount
  useEffect(() => {
    deliveryApi
      .getHubs()
      .then((hubs) => {
        if (Array.isArray(hubs) && hubs.length > 0) {
          const activeOnly = hubs.filter((h) => h.isActive !== false);
          const finalHubs = activeOnly.length > 0 ? activeOnly : hubs;
          setAvailableHubs(finalHubs);
          setSelectedHubId((prev) =>
            prev && finalHubs.some((h) => h.id === prev) ? prev : finalHubs[0].id
          );
        }
      })
      .catch((err) => {
        console.warn("Could not load fresh hubs from server, using active default hubs:", err);
      });
  }, []);

  // Close custom dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (hubDropdownRef.current && !hubDropdownRef.current.contains(e.target as Node)) {
        setIsHubDropdownOpen(false);
      }
    }
    if (isHubDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isHubDropdownOpen]);

  const cleanPhone = (input: string) => {
    const digits = input.replace(/\D/g, "");
    if (digits.startsWith("91") && digits.length > 10) {
      return `+${digits}`;
    }
    return `+91${digits.slice(-10)}`;
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    const formatted = cleanPhone(phone);
    if (formatted.length < 13) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }
    const cleanId = partnerId.trim();
    if (!cleanId) {
      setError("Please enter your 6-digit Partner Access ID.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await deliveryApi.loginPartner(formatted, cleanId);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(
        err?.message ||
        "Authentication failed. Please verify your mobile number and 6-digit Partner Access ID."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLicensePhotoName(file.name);
      const reader = new FileReader();
      reader.onload = () => {
        setLicensePhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Please enter your full name.");
      return;
    }
    const formatted = cleanPhone(regPhone);
    if (formatted.length < 13) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!selectedHubId) {
      setError("Please select the hub you want to work at.");
      return;
    }
    if (!licensePhoto) {
      setError("Please upload a photo of your driving licence for hub verification.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await deliveryApi.registerPartner({
        name: name.trim(),
        phone: formatted,
        hubId: selectedHubId,
        vehicleType,
        vehicleNumber: vehicleNumber.trim() || undefined,
        licensePhoto,
      });

      const chosenHub = availableHubs.find((h) => h.id === selectedHubId);
      setApplicationSuccess({
        hubName: chosenHub?.name || res.hub?.name || "Selected Hub",
        hubAddress: chosenHub?.address || res.hub?.address,
        instructions:
          res.instructions ||
          "Please visit the hub in person with your original Driving Licence and vehicle registration for physical verification.",
      });

      // Pre-fill phone on login tab
      setPhone(formatted);
      setPartnerId("");
    } catch (err: any) {
      setError(err?.message || "Failed to submit request. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const currentSelectedHub =
    availableHubs.find((h) => h.id === selectedHubId) || availableHubs[0];

  return (
    <div style={styles.container}>
      <div style={styles.card} className="delivery-card-responsive">
        {/* Top Accent Strip */}
        <div style={styles.topAccent} />

        {/* Brand Header */}
        <div style={styles.header}>
          <div style={styles.logoBadge}>
            <Bike size={28} color="#FFFFFF" />
          </div>
          <div style={{ textAlign: "center" }}>
            <span style={styles.brandTitle}>FreshGo Delivery</span>
            <span style={styles.brandSub}>Rider Partner Portal</span>
          </div>
        </div>

        {/* Segmented Tab Switcher */}
        {!applicationSuccess && (
          <div style={styles.tabBar}>
            <button
              type="button"
              onClick={() => {
                setActiveTab("login");
                setError(null);
              }}
              style={{
                ...styles.tabBtn,
                background: activeTab === "login" ? "#1F4D46" : "transparent",
                color: activeTab === "login" ? "#FFFFFF" : "#5C6B66",
              }}
            >
              Partner Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("register");
                setError(null);
              }}
              style={{
                ...styles.tabBtn,
                background: activeTab === "register" ? "#1F4D46" : "transparent",
                color: activeTab === "register" ? "#FFFFFF" : "#5C6B66",
              }}
            >
              Join / Change Hub
            </button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div style={styles.errorBox}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* VIEW 1: Application Received Success Screen */}
        {applicationSuccess ? (
          <div style={{ textAlign: "center", padding: "10px 0" }}>
            <div style={styles.successBadge}>
              <CheckCircle2 size={36} color="#2E7D5B" />
            </div>
            <h2 style={styles.successTitle}>Application Submitted!</h2>
            <p style={styles.successSubtitle}>
              Request to work at <strong>{applicationSuccess.hubName}</strong> has been forwarded to the Hub Admin.
            </p>

            {/* Hub Visit Requirement Notice */}
            <div style={styles.visitNoticeCard}>
              <div style={styles.visitNoticeHeader}>
                <MapPin size={18} color="#E5623E" />
                <strong>Mandatory In-Person Hub Verification</strong>
              </div>
              <p style={styles.visitNoticeText}>
                {applicationSuccess.instructions}
              </p>
              {applicationSuccess.hubAddress && (
                <div style={styles.hubAddressBox}>
                  📍 <strong>Hub Address:</strong> {applicationSuccess.hubAddress}
                </div>
              )}
              <div style={styles.visitTip}>
                Once the Hub Admin approves your profile, they will provide your unique <strong>6-digit Partner Access ID</strong> to sign in.
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setApplicationSuccess(null);
                setActiveTab("login");
              }}
              style={styles.button}
            >
              Go to Partner Sign In
              <ChevronRight size={18} />
            </button>
          </div>
        ) : activeTab === "login" ? (
          /* VIEW 2: Partner Sign In */
          <form onSubmit={handleLogin} style={styles.form}>
            <div style={styles.titleWrap}>
              <h1 style={styles.title}>Partner Sign In</h1>
              <p style={styles.subtitle}>
                Enter your registered mobile number and 6-digit Partner Access ID provided by your Hub Admin.
              </p>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>MOBILE NUMBER</label>
              <div style={styles.phoneInputWrap}>
                <span style={styles.phonePrefix}>+91</span>
                <input
                  type="tel"
                  style={styles.input}
                  placeholder="Enter mobile number"
                  value={phone.replace("+91", "")}
                  onChange={(e) => setPhone(`+91${e.target.value.replace(/\D/g, "")}`)}
                  maxLength={10}
                  autoFocus
                />
              </div>
            </div>

            <div style={styles.inputGroup}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label style={styles.label}>6-DIGIT PARTNER ACCESS ID</label>
              </div>
              <div style={styles.idInputWrap}>
                <KeyRound size={18} color="#8b968f" style={{ marginLeft: 14 }} />
                <input
                  type={showPartnerId ? "text" : "password"}
                  style={{ ...styles.input, letterSpacing: "2px", fontFamily: "monospace" }}
                  placeholder="e.g. 842109"
                  value={partnerId}
                  onChange={(e) => setPartnerId(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  maxLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPartnerId(!showPartnerId)}
                  aria-label={showPartnerId ? "Hide ID" : "Show ID"}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#8B968F",
                    cursor: "pointer",
                    padding: "0 14px",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  {showPartnerId ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <small style={{ fontSize: "11px", color: "#8b968f", marginTop: "4px" }}>
                Issued by your Hub Admin upon physical verification of documents.
              </small>
            </div>

            <button
              type="submit"
              disabled={isLoading || phone.replace(/\D/g, "").length < 10 || !partnerId.trim()}
              style={{
                ...styles.button,
                opacity:
                  isLoading || phone.replace(/\D/g, "").length < 10 || !partnerId.trim()
                    ? 0.6
                    : 1,
              }}
            >
              {isLoading ? "Signing in..." : "Sign In to Portal"}
              <ChevronRight size={18} />
            </button>

            {/* Switch tab link */}
            <div style={{ textAlign: "center", marginTop: "12px" }}>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("register");
                  setError(null);
                }}
                style={styles.textBtn}
              >
                New Partner or Requesting Hub Transfer? <strong>Apply / Change Hub →</strong>
              </button>
            </div>
          </form>
        ) : (
          /* VIEW 3: Apply / Request Hub */
          <form onSubmit={handleRegister} style={styles.form} className="delivery-form-responsive">
            <div style={styles.titleWrap}>
              <h1 style={styles.title}>Join as Partner / Transfer Hub</h1>
              <p style={styles.subtitle}>
                Submit your details and preferred hub. Existing riders can use this same form to change hubs.
              </p>
            </div>

            {/* Mandatory Hub Visit Notice */}
            <div style={styles.visitNoticeBanner}>
              <MapPin size={16} color="#BE4436" style={{ flexShrink: 0, marginTop: "2px" }} />
              <div style={{ fontSize: "12px", color: "#0F2E29", lineHeight: 1.4, flex: 1, minWidth: 0, wordBreak: "break-word" }}>
                <strong>Important:</strong> After requesting, please visit your selected Hub in person with your original Driving Licence for physical document verification.
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>FULL NAME *</label>
              <div style={styles.iconInputWrap}>
                <User size={18} color="#8b968f" style={{ marginLeft: 14, flexShrink: 0 }} />
                <input
                  type="text"
                  style={styles.input}
                  placeholder="e.g. Rahul Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>MOBILE NUMBER *</label>
              <div style={styles.phoneInputWrap}>
                <span style={styles.phonePrefix}>+91</span>
                <input
                  type="tel"
                  style={styles.input}
                  placeholder="Enter mobile number"
                  value={regPhone.replace("+91", "")}
                  onChange={(e) => setRegPhone(`+91${e.target.value.replace(/\D/g, "")}`)}
                  maxLength={10}
                  required
                />
              </div>
            </div>

            <div style={styles.inputGroup} ref={hubDropdownRef}>
              <label style={styles.label}>PREFERRED FULFILLMENT HUB *</label>
              <div style={{ position: "relative", width: "100%", minWidth: 0, boxSizing: "border-box" }}>
                <button
                  type="button"
                  onClick={() => setIsHubDropdownOpen(!isHubDropdownOpen)}
                  aria-expanded={isHubDropdownOpen}
                  aria-haspopup="listbox"
                  style={{
                    ...styles.hubSelectTrigger,
                    borderColor: isHubDropdownOpen ? "#1F4D46" : "#E3DDCF",
                    background: isHubDropdownOpen ? "#FFFFFF" : "#FCFBF9",
                    boxShadow: isHubDropdownOpen ? "0 0 0 3px rgba(31, 77, 70, 0.12)" : "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "8px",
                        background: "#E4ECE9",
                        display: "grid",
                        placeItems: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Building size={16} color="#1F4D46" />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", textAlign: "left", flex: 1, minWidth: 0 }}>
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: 700,
                          color: "#0F2E29",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          display: "block",
                          maxWidth: "100%",
                        }}
                      >
                        {currentSelectedHub ? currentSelectedHub.name : "Select a Fulfillment Hub"}
                      </span>
                      {currentSelectedHub && (
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 600,
                            color: "#5C6B66",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            display: "block",
                            maxWidth: "100%",
                          }}
                        >
                          📍 {currentSelectedHub.city} {currentSelectedHub.code ? `· ${currentSelectedHub.code}` : ""}
                        </span>
                      )}
                    </div>
                  </div>

                  <ChevronDown
                    size={18}
                    color="#8B968F"
                    style={{
                      transform: isHubDropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s ease",
                      flexShrink: 0,
                      marginLeft: "8px",
                    }}
                  />
                </button>

                {/* Dropdown Menu Popup - 100% contained within bounds */}
                {isHubDropdownOpen && (
                  <div
                    role="listbox"
                    style={{
                      position: "absolute",
                      top: "calc(100% + 4px)",
                      left: 0,
                      right: 0,
                      width: "100%",
                      maxWidth: "100%",
                      background: "#FFFFFF",
                      border: "1.5px solid #1F4D46",
                      borderRadius: "14px",
                      boxShadow: "0 12px 32px rgba(15, 46, 41, 0.2)",
                      zIndex: 999,
                      overflow: "hidden",
                      boxSizing: "border-box",
                    }}
                  >
                    <div
                      style={{
                        padding: "8px 12px",
                        background: "#F6F2EA",
                        borderBottom: "1px solid #E3DDCF",
                        fontSize: "10px",
                        fontWeight: 800,
                        color: "#1F4D46",
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span>Active Hubs ({availableHubs.length})</span>
                      <span style={{ fontSize: "10px", color: "#5C6B66", fontWeight: 600 }}>Tap to select</span>
                    </div>

                    <div style={{ maxHeight: "200px", overflowY: "auto", width: "100%", boxSizing: "border-box" }}>
                      {availableHubs.map((hub) => {
                        const isSelected = hub.id === selectedHubId;
                        return (
                          <div
                            key={hub.id}
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => {
                              setSelectedHubId(hub.id);
                              setIsHubDropdownOpen(false);
                            }}
                            style={{
                              padding: "10px 14px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: "10px",
                              cursor: "pointer",
                              background: isSelected ? "#E3F1E9" : "#FFFFFF",
                              borderBottom: "1px solid #F0ECE4",
                              transition: "background 0.12s ease",
                              boxSizing: "border-box",
                              width: "100%",
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) e.currentTarget.style.background = "#FAF8F4";
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) e.currentTarget.style.background = "#FFFFFF";
                            }}
                          >
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div
                                style={{
                                  fontSize: "13px",
                                  fontWeight: 700,
                                  color: isSelected ? "#0F2E29" : "#17211E",
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  maxWidth: "100%",
                                }}
                              >
                                {hub.name}
                              </div>
                              <div
                                style={{
                                  fontSize: "11px",
                                  color: "#5C6B66",
                                  marginTop: "2px",
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  maxWidth: "100%",
                                }}
                              >
                                📍 {hub.city} {hub.code ? `(${hub.code})` : ""}{hub.address ? ` · ${hub.address}` : ""}
                              </div>
                            </div>
                            {isSelected && (
                              <CheckCircle2 size={16} color="#2E7D5B" style={{ flexShrink: 0 }} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="partner-form-grid">
              <div style={styles.inputGroup}>
                <label style={styles.label}>VEHICLE TYPE</label>
                <div style={styles.selectWrap}>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    style={styles.selectInput}
                  >
                    <option value="Bike">Motorcycle / Bike</option>
                    <option value="Scooter">Scooter / EV</option>
                  </select>
                  <ChevronDown size={16} color="#8b968f" style={styles.selectChevron} />
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>VEHICLE NUMBER</label>
                <input
                  type="text"
                  style={{
                    ...styles.input,
                    border: "1.5px solid #e3ddcf",
                    borderRadius: "12px",
                    background: "#fcfbf9",
                    padding: "10px 12px",
                    width: "100%",
                    minWidth: 0,
                    maxWidth: "100%",
                    boxSizing: "border-box",
                  }}
                  placeholder="KL-11-AB-1234"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                />
              </div>
            </div>

            {/* Driving Licence Photo Upload */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>DRIVING LICENCE PHOTO *</label>
              <label style={styles.uploadArea}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  style={{ display: "none" }}
                  required={!licensePhoto}
                />
                <Upload size={22} color="#1F4D46" style={{ flexShrink: 0 }} />
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#1F4D46",
                    maxWidth: "100%",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    display: "block",
                    padding: "0 8px",
                    boxSizing: "border-box",
                  }}
                >
                  {licensePhotoName ? `Selected: ${licensePhotoName}` : "Click to Upload Licence Photo"}
                </span>
                <span style={{ fontSize: "11px", color: "#8B968F" }}>
                  JPG, PNG or photo taken from camera
                </span>
              </label>

              {licensePhoto && (
                <div style={styles.photoPreviewBox}>
                  <img
                    src={licensePhoto}
                    alt="Driving Licence Preview"
                    style={{ maxHeight: "110px", maxWidth: "100%", borderRadius: "8px", objectFit: "contain" }}
                  />
                  <div style={{ fontSize: "11px", color: "#2E7D5B", fontWeight: 700, marginTop: "4px" }}>
                    ✓ Licence photo attached for verification
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                ...styles.button,
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              {isLoading ? "Submitting Application..." : "Submit Application to Hub Admin"}
              <ChevronRight size={18} style={{ flexShrink: 0 }} />
            </button>

            <div style={{ textAlign: "center", marginTop: "6px" }}>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("login");
                  setError(null);
                }}
                style={styles.textBtn}
              >
                Already approved? <strong>Sign In with Partner Access ID →</strong>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "radial-gradient(circle at 10% 20%, #153A34 0%, #0F2E29 90%)",
    padding: "20px 12px",
    fontFamily: "'Manrope', sans-serif",
    boxSizing: "border-box",
    width: "100%",
    overflowX: "hidden",
  },
  card: {
    width: "100%",
    maxWidth: "460px",
    background: "#FFFFFF",
    borderRadius: "20px",
    boxShadow: "0 25px 60px rgba(0, 0, 0, 0.35)",
    overflow: "visible",
    position: "relative",
    boxSizing: "border-box",
    margin: "0 auto",
  },
  topAccent: {
    height: "5px",
    background: "linear-gradient(90deg, #1F4D46, #2E7D5B, #E5623E)",
    borderTopLeftRadius: "20px",
    borderTopRightRadius: "20px",
  },
  header: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "28px 20px 16px",
    gap: "12px",
  },
  logoBadge: {
    width: "56px",
    height: "56px",
    borderRadius: "16px",
    background: "#1F4D46",
    display: "grid",
    placeItems: "center",
    boxShadow: "0 6px 16px rgba(31, 77, 70, 0.3)",
  },
  brandTitle: {
    display: "block",
    fontFamily: "'Fraunces', serif",
    fontSize: "24px",
    fontWeight: 700,
    color: "#0F2E29",
    letterSpacing: "-0.5px",
  },
  brandSub: {
    display: "block",
    fontSize: "12px",
    fontWeight: 700,
    color: "#5C6B66",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginTop: "2px",
  },
  tabBar: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    background: "#F6F2EA",
    borderRadius: "12px",
    padding: "4px",
    margin: "0 20px 18px",
    border: "1px solid #E3DDCF",
  },
  tabBtn: {
    border: "none",
    padding: "10px 12px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  form: {
    padding: "0 20px 24px",
    display: "grid",
    gap: "16px",
    width: "100%",
    boxSizing: "border-box",
  },
  titleWrap: {
    marginBottom: "4px",
  },
  title: {
    fontSize: "19px",
    fontWeight: 800,
    color: "#0F2E29",
    margin: "0 0 4px",
  },
  subtitle: {
    fontSize: "12px",
    color: "#5C6B66",
    lineHeight: 1.45,
    margin: 0,
  },
  errorBox: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 14px",
    borderRadius: "10px",
    background: "#FBE7E3",
    color: "#BE4436",
    fontSize: "12px",
    fontWeight: 600,
    margin: "0 20px 14px",
  },
  inputGroup: {
    display: "grid",
    gap: "6px",
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
  },
  label: {
    fontSize: "11px",
    fontWeight: 800,
    letterSpacing: "0.05em",
    color: "#1F4D46",
    textTransform: "uppercase",
  },
  phoneInputWrap: {
    display: "flex",
    alignItems: "center",
    border: "1.5px solid #E3DDCF",
    borderRadius: "12px",
    overflow: "hidden",
    background: "#FCFBF9",
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
  },
  idInputWrap: {
    display: "flex",
    alignItems: "center",
    border: "1.5px solid #E3DDCF",
    borderRadius: "12px",
    overflow: "hidden",
    background: "#FCFBF9",
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
  },
  hubSelectTrigger: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    border: "1.5px solid #E3DDCF",
    borderRadius: "12px",
    background: "#FCFBF9",
    padding: "8px 12px",
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
    cursor: "pointer",
    textAlign: "left",
    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
  },
  selectWrap: {
    position: "relative",
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
  },
  selectInput: {
    width: "100%",
    minWidth: 0,
    maxWidth: "100%",
    border: "1.5px solid #E3DDCF",
    borderRadius: "12px",
    background: "#FCFBF9",
    padding: "11px 36px 11px 14px",
    fontSize: "14px",
    fontWeight: 600,
    color: "#17211E",
    fontFamily: "inherit",
    boxSizing: "border-box",
    cursor: "pointer",
    appearance: "none",
    WebkitAppearance: "none",
  },
  selectChevron: {
    position: "absolute",
    right: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    pointerEvents: "none",
  },
  iconInputWrap: {
    display: "flex",
    alignItems: "center",
    border: "1.5px solid #E3DDCF",
    borderRadius: "12px",
    overflow: "hidden",
    background: "#FCFBF9",
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
  },
  phonePrefix: {
    padding: "0 14px",
    fontWeight: 800,
    fontSize: "14px",
    color: "#1F4D46",
    borderRight: "1px solid #E3DDCF",
    background: "#F6F2EA",
    lineHeight: "44px",
    flexShrink: 0,
  },
  input: {
    flex: 1,
    width: "100%",
    minWidth: 0,
    maxWidth: "100%",
    border: "none",
    outline: "none",
    background: "transparent",
    padding: "11px 14px",
    fontSize: "14px",
    fontWeight: 600,
    color: "#17211E",
    fontFamily: "inherit",
    boxSizing: "border-box",
  },
  button: {
    border: "none",
    borderRadius: "12px",
    background: "#1F4D46",
    color: "#FFFFFF",
    minHeight: "46px",
    padding: "0 18px",
    fontSize: "14px",
    fontWeight: 800,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    cursor: "pointer",
    boxShadow: "0 4px 14px rgba(31, 77, 70, 0.25)",
    transition: "transform 0.15s ease",
    marginTop: "4px",
    width: "100%",
    boxSizing: "border-box",
  },
  infoBanner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 14px",
    borderRadius: "10px",
    background: "#F6F2EA",
    fontSize: "12px",
    color: "#1F4D46",
    border: "1px solid #E3DDCF",
    width: "100%",
    boxSizing: "border-box",
  },
  fillBtn: {
    background: "#E4ECE9",
    border: "1px solid #1F4D46",
    color: "#1F4D46",
    padding: "3px 8px",
    borderRadius: "6px",
    fontSize: "11px",
    fontWeight: 700,
    cursor: "pointer",
    flexShrink: 0,
  },
  textBtn: {
    border: "none",
    background: "transparent",
    color: "#1F4D46",
    fontSize: "12px",
    cursor: "pointer",
    padding: "4px 0",
  },
  visitNoticeBanner: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    padding: "12px 14px",
    borderRadius: "10px",
    background: "#FEF3C7",
    border: "1px solid #F59E0B",
    width: "100%",
    boxSizing: "border-box",
  },
  uploadArea: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    border: "2px dashed #1F4D46",
    borderRadius: "12px",
    padding: "16px 12px",
    background: "#F6F2EA",
    cursor: "pointer",
    textAlign: "center",
    width: "100%",
    boxSizing: "border-box",
    overflow: "hidden",
  },
  photoPreviewBox: {
    padding: "10px",
    background: "#F6F2EA",
    borderRadius: "10px",
    border: "1px solid #E3DDCF",
    textAlign: "center",
    width: "100%",
    boxSizing: "border-box",
    overflow: "hidden",
  },
  successBadge: {
    width: "64px",
    height: "64px",
    borderRadius: "50%",
    background: "#E3F1E9",
    display: "grid",
    placeItems: "center",
    margin: "0 auto 16px",
  },
  successTitle: {
    fontFamily: "'Fraunces', serif",
    fontSize: "22px",
    color: "#0F2E29",
    margin: "0 0 6px",
  },
  successSubtitle: {
    fontSize: "13px",
    color: "#5C6B66",
    margin: "0 0 20px",
    lineHeight: 1.45,
  },
  visitNoticeCard: {
    background: "#F6F2EA",
    border: "1.5px solid #2E7D5B",
    borderRadius: "14px",
    padding: "18px",
    textAlign: "left",
    marginBottom: "20px",
  },
  visitNoticeHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "13px",
    color: "#0F2E29",
    marginBottom: "8px",
  },
  visitNoticeText: {
    fontSize: "12px",
    color: "#17211E",
    lineHeight: 1.45,
    margin: "0 0 10px",
  },
  hubAddressBox: {
    fontSize: "12px",
    color: "#1F4D46",
    background: "#E4ECE9",
    padding: "8px 12px",
    borderRadius: "8px",
    marginBottom: "10px",
  },
  visitTip: {
    fontSize: "11px",
    color: "#2E7D5B",
    fontWeight: 700,
  },
  footer: {
    padding: "14px 20px",
    textAlign: "center",
    borderTop: "1px solid #F6F2EA",
    background: "#FAF8F4",
    fontSize: "11px",
    fontWeight: 600,
    color: "#8B968F",
    borderBottomLeftRadius: "20px",
    borderBottomRightRadius: "20px",
  },
};
