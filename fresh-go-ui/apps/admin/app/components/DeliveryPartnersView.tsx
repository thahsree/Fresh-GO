"use client";

import { useState, useEffect } from "react";
import { api, DeliveryPartnerItem, AdminUser, Hub } from "../lib/api";
import { CustomDropdown } from "./CustomDropdown";
import {
  Bike,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  RefreshCw,
  Copy,
  Check,
  Eye,
  Phone,
  Building,
  FileText,
  AlertCircle,
  ShieldCheck,
  Share2,
} from "lucide-react";

type DeliveryPartnersViewProps = {
  currentUser: AdminUser | null;
  onToast: (msg: string, type?: "success" | "error" | "info" | "delete") => void;
};

export function DeliveryPartnersView({
  currentUser,
  onToast,
}: DeliveryPartnersViewProps) {
  const [partners, setPartners] = useState<DeliveryPartnerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "VERIFIED" | "REJECTED">("ALL");
  const [selectedHubId, setSelectedHubId] = useState<string>("");
  const [hubsList, setHubsList] = useState<Hub[]>([]);

  // Preview Licence Modal
  const [previewPhoto, setPreviewPhoto] = useState<{
    url: string;
    partnerName: string;
    phone: string;
  } | null>(null);

  // Approval Result Modal (highlighting the 6-digit Partner Access ID)
  const [approvalModal, setApprovalModal] = useState<{
    partner: DeliveryPartnerItem;
    partnerId: string;
  } | null>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchPartners = async () => {
    setLoading(true);
    try {
      // Hub Admin automatically filtered by backend based on user.hubId, or pass query
      const hubToFilter = currentUser?.role === "SUPER_ADMIN" ? selectedHubId || undefined : currentUser?.hubId;
      const data = await api.deliveryPartners.getAll(hubToFilter);
      setPartners(data || []);
    } catch (err: any) {
      onToast(err?.message || "Failed to load delivery partners", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchHubs = async () => {
    try {
      const data = await api.hubs.getAll();
      setHubsList(data || []);
    } catch {
      // silent
    }
  };

  useEffect(() => {
    fetchPartners();
    if (currentUser?.role === "SUPER_ADMIN") {
      fetchHubs();
    }
  }, [selectedHubId, currentUser]);

  const handleUpdateStatus = async (
    partner: DeliveryPartnerItem,
    status: "VERIFIED" | "REJECTED"
  ) => {
    try {
      const updated = await api.deliveryPartners.updateStatus(partner.id, status);
      onToast(
        status === "VERIFIED"
          ? `${partner.user.name || "Partner"} approved! 6-digit ID: ${updated.partnerId}`
          : `Partner application rejected`,
        status === "VERIFIED" ? "success" : "info"
      );

      if (status === "VERIFIED" && updated.partnerId) {
        setApprovalModal({
          partner: updated,
          partnerId: updated.partnerId,
        });
      }

      fetchPartners();
    } catch (err: any) {
      onToast(err?.message || "Failed to update partner status", "error");
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 3000);
    onToast("Partner ID copied to clipboard!", "info");
  };

  const filtered = partners.filter((p) => {
    const matchesStatus =
      statusFilter === "ALL" ? true : p.kycStatus === statusFilter;
    const q = search.toLowerCase();
    const matchesSearch =
      !search ||
      p.user?.name?.toLowerCase().includes(q) ||
      p.user?.phone?.includes(q) ||
      p.partnerId?.includes(q) ||
      p.vehicleNumber?.toLowerCase().includes(q) ||
      p.hub?.name?.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const pendingCount = partners.filter((p) => p.kycStatus === "PENDING").length;
  const verifiedCount = partners.filter((p) => p.kycStatus === "VERIFIED").length;

  return (
    <div style={{ display: "grid", gap: "24px", fontFamily: "'Manrope', sans-serif" }}>
      {/* Top Header Card */}
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "16px",
          border: "1px solid #E3DDCF",
          padding: "24px 28px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "14px",
              background: "#E4ECE9",
              color: "#1F4D46",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Bike size={28} />
          </div>
          <div>
            <h2
              style={{
                fontFamily: "'Fraunces', serif",
                fontSize: "24px",
                color: "#0F2E29",
                margin: "0 0 4px 0",
              }}
            >
              Delivery Partners & Onboarding
            </h2>
            <p style={{ fontSize: "13px", color: "#5C6B66", margin: 0 }}>
              {currentUser?.hub
                ? `Hub Admin Portal: ${currentUser.hub.name} (${currentUser.hub.code})`
                : "Approve rider applications, verify driving licences, and issue 6-digit Access IDs"}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          {currentUser?.role === "SUPER_ADMIN" && hubsList.length > 0 && (
            <CustomDropdown
              value={selectedHubId}
              onChange={setSelectedHubId}
              options={[
                { value: "", label: "All Fulfillment Hubs" },
                ...hubsList.map((h) => ({
                  value: h.id,
                  label: `${h.name} (${h.code})`,
                })),
              ]}
              style={{ minWidth: "210px", width: "auto" }}
            />
          )}

          <div style={{ position: "relative" }}>
            <Search
              size={16}
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#8B968F",
              }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search partner, phone, 6-digit ID..."
              style={{
                padding: "9px 12px 9px 36px",
                borderRadius: "8px",
                border: "1px solid #E3DDCF",
                fontSize: "13px",
                outline: "none",
                minWidth: "240px",
              }}
            />
          </div>

          <button
            onClick={fetchPartners}
            title="Refresh Partners"
            style={{
              padding: "9px 12px",
              borderRadius: "8px",
              border: "1px solid #E3DDCF",
              background: "#FFFFFF",
              color: "#1F4D46",
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
            }}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Metric Counters & Filters */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
        <button
          type="button"
          onClick={() => setStatusFilter("ALL")}
          style={{
            background: statusFilter === "ALL" ? "#1F4D46" : "#FFFFFF",
            color: statusFilter === "ALL" ? "#FFFFFF" : "#0F2E29",
            border: "1px solid #E3DDCF",
            borderRadius: "12px",
            padding: "16px 20px",
            textAlign: "left",
            cursor: "pointer",
            boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
            transition: "all 0.15s ease",
          }}
        >
          <div style={{ fontSize: "12px", fontWeight: 700, opacity: 0.8, textTransform: "uppercase" }}>
            Total Registered
          </div>
          <div style={{ fontSize: "28px", fontWeight: 800, marginTop: "4px" }}>
            {partners.length}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("PENDING")}
          style={{
            background: statusFilter === "PENDING" ? "#E5623E" : "#FFFFFF",
            color: statusFilter === "PENDING" ? "#FFFFFF" : "#BE4436",
            border: statusFilter === "PENDING" ? "1px solid #E5623E" : "1px solid #F5C7BE",
            borderRadius: "12px",
            padding: "16px 20px",
            textAlign: "left",
            cursor: "pointer",
            boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
            transition: "all 0.15s ease",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, opacity: 0.9, textTransform: "uppercase" }}>
              Pending Hub Approval
            </span>
            {pendingCount > 0 && (
              <span
                style={{
                  background: statusFilter === "PENDING" ? "#FFFFFF" : "#E5623E",
                  color: statusFilter === "PENDING" ? "#E5623E" : "#FFFFFF",
                  padding: "2px 8px",
                  borderRadius: "999px",
                  fontSize: "11px",
                  fontWeight: 800,
                }}
              >
                Needs Action
              </span>
            )}
          </div>
          <div style={{ fontSize: "28px", fontWeight: 800, marginTop: "4px" }}>
            {pendingCount}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("VERIFIED")}
          style={{
            background: statusFilter === "VERIFIED" ? "#2E7D5B" : "#FFFFFF",
            color: statusFilter === "VERIFIED" ? "#FFFFFF" : "#2E7D5B",
            border: statusFilter === "VERIFIED" ? "1px solid #2E7D5B" : "1px solid #C4E2D3",
            borderRadius: "12px",
            padding: "16px 20px",
            textAlign: "left",
            cursor: "pointer",
            boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
            transition: "all 0.15s ease",
          }}
        >
          <div style={{ fontSize: "12px", fontWeight: 700, opacity: 0.9, textTransform: "uppercase" }}>
            Approved & Active
          </div>
          <div style={{ fontSize: "28px", fontWeight: 800, marginTop: "4px" }}>
            {verifiedCount}
          </div>
        </button>
      </div>

      {/* Partners Table Card */}
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "16px",
          border: "1px solid #E3DDCF",
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#F6F2EA", borderBottom: "1px solid #E3DDCF" }}>
                <th style={{ padding: "14px 18px", textAlign: "left", color: "#1F4D46", fontWeight: 700 }}>
                  Delivery Partner
                </th>
                <th style={{ padding: "14px 16px", textAlign: "left", color: "#1F4D46", fontWeight: 700 }}>
                  Assigned / Requested Hub
                </th>
                <th style={{ padding: "14px 16px", textAlign: "center", color: "#1F4D46", fontWeight: 700 }}>
                  Driving Licence
                </th>
                <th style={{ padding: "14px 16px", textAlign: "center", color: "#1F4D46", fontWeight: 700 }}>
                  Status
                </th>
                <th style={{ padding: "14px 18px", textAlign: "left", color: "#1F4D46", fontWeight: 700 }}>
                  Unique 6-Digit ID
                </th>
                <th style={{ padding: "14px 18px", textAlign: "right", color: "#1F4D46", fontWeight: 700 }}>
                  Hub Admin Approval
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "#8B968F" }}>
                    Loading delivery partner applicants...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "#8B968F" }}>
                    No delivery partners matching this filter.
                  </td>
                </tr>
              ) : (
                filtered.map((partner) => {
                  const isPending = partner.kycStatus === "PENDING";
                  const isVerified = partner.kycStatus === "VERIFIED";

                  return (
                    <tr
                      key={partner.id}
                      style={{
                        borderBottom: "1px solid #EFEAE0",
                        background: isPending ? "rgba(229, 98, 62, 0.03)" : "transparent",
                        transition: "background 0.15s ease",
                      }}
                    >
                      {/* Delivery Partner Details */}
                      <td style={{ padding: "14px 18px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div
                            style={{
                              width: "38px",
                              height: "38px",
                              borderRadius: "10px",
                              background: isVerified ? "#E3F1E9" : "#F6F2EA",
                              color: isVerified ? "#2E7D5B" : "#1F4D46",
                              display: "grid",
                              placeItems: "center",
                              fontWeight: 800,
                              fontSize: "14px",
                            }}
                          >
                            <Bike size={18} />
                          </div>
                          <div>
                            <strong style={{ display: "block", color: "#0F2E29", fontSize: "14px" }}>
                              {partner.user?.name || "Rider Partner"}
                            </strong>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#5C6B66", fontSize: "12px", marginTop: "2px" }}>
                              <Phone size={12} />
                              {partner.user?.phone}
                            </div>
                            <small style={{ color: "#8B968F", fontSize: "11px" }}>
                              {partner.vehicleType || "Motorcycle"} {partner.vehicleNumber ? `· ${partner.vehicleNumber}` : ""}
                            </small>
                          </div>
                        </div>
                      </td>

                      {/* Hub */}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Building size={14} color="#1F4D46" />
                          <span style={{ fontWeight: 700, color: "#1F4D46" }}>
                            {partner.hub?.name || "Unassigned"}
                          </span>
                        </div>
                        <small style={{ color: "#8B968F", fontSize: "11px", display: "block", marginTop: "2px" }}>
                          {partner.hub?.code || "Default"}
                        </small>
                      </td>

                      {/* Driving Licence Photo */}
                      <td style={{ padding: "14px 16px", textAlign: "center" }}>
                        {partner.licensePhoto ? (
                          <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                            <div
                              onClick={() =>
                                setPreviewPhoto({
                                  url: partner.licensePhoto!,
                                  partnerName: partner.user?.name || "Delivery Partner",
                                  phone: partner.user?.phone || "",
                                })
                              }
                              style={{
                                width: "64px",
                                height: "40px",
                                borderRadius: "6px",
                                overflow: "hidden",
                                border: "1px solid #1F4D46",
                                cursor: "pointer",
                                boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                                background: "#0F2E29",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                              title="Click to view full licence document"
                            >
                              <img
                                src={partner.licensePhoto}
                                alt="Licence"
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewPhoto({
                                  url: partner.licensePhoto!,
                                  partnerName: partner.user?.name || "Delivery Partner",
                                  phone: partner.user?.phone || "",
                                })
                              }
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "3px 8px",
                                borderRadius: "6px",
                                border: "1px solid #1F4D46",
                                background: "#E4ECE9",
                                color: "#1F4D46",
                                fontSize: "11px",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              <Eye size={12} />
                              Inspect
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: "11px", color: "#8B968F", fontStyle: "italic" }}>
                            Original to be inspected
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: "14px 16px", textAlign: "center" }}>
                        {isPending ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "4px 9px",
                              borderRadius: "999px",
                              background: "#FEF3C7",
                              color: "#B45309",
                              fontSize: "11px",
                              fontWeight: 800,
                            }}
                          >
                            <Clock size={12} />
                            Pending Hub Approval
                          </span>
                        ) : isVerified ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "4px 9px",
                              borderRadius: "999px",
                              background: "#E3F1E9",
                              color: "#2E7D5B",
                              fontSize: "11px",
                              fontWeight: 800,
                            }}
                          >
                            <CheckCircle size={12} />
                            Approved & Active
                          </span>
                        ) : (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "4px 9px",
                              borderRadius: "999px",
                              background: "#FBE7E3",
                              color: "#BE4436",
                              fontSize: "11px",
                              fontWeight: 800,
                            }}
                          >
                            <XCircle size={12} />
                            Rejected
                          </span>
                        )}
                      </td>

                      {/* 6-Digit ID Column */}
                      <td style={{ padding: "14px 18px" }}>
                        {partner.partnerId ? (
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                            <span
                              style={{
                                display: "inline-block",
                                fontFamily: "monospace",
                                fontSize: "14px",
                                fontWeight: 800,
                                color: "#0F2E29",
                                background: "#F6F2EA",
                                border: "1px solid #E3DDCF",
                                padding: "4px 10px",
                                borderRadius: "6px",
                                letterSpacing: "1px",
                              }}
                            >
                              {partner.partnerId}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(partner.partnerId!, partner.id)}
                              title="Copy 6-digit Partner Access ID"
                              style={{
                                background: "transparent",
                                border: "none",
                                cursor: "pointer",
                                color: copiedId === partner.id ? "#2E7D5B" : "#5C6B66",
                                padding: "4px",
                              }}
                            >
                              {copiedId === partner.id ? <Check size={14} /> : <Copy size={14} />}
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: "12px", color: "#8B968F" }}>
                            Generated on approval
                          </span>
                        )}
                      </td>

                      {/* Hub Admin Approval Actions */}
                      <td style={{ padding: "14px 18px", textAlign: "right" }}>
                        {isPending ? (
                          <div style={{ display: "inline-flex", gap: "8px", alignItems: "center" }}>
                            {partner.licensePhoto && (
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewPhoto({
                                    url: partner.licensePhoto!,
                                    partnerName: partner.user?.name || "Delivery Partner",
                                    phone: partner.user?.phone || "",
                                  })
                                }
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  padding: "7px 11px",
                                  borderRadius: "8px",
                                  border: "1px solid #1F4D46",
                                  background: "#E4ECE9",
                                  color: "#1F4D46",
                                  fontSize: "12px",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
                              >
                                <Eye size={13} />
                                View Document
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(partner, "VERIFIED")}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "5px",
                                padding: "7px 14px",
                                borderRadius: "8px",
                                background: "#2E7D5B",
                                color: "#FFFFFF",
                                fontSize: "12px",
                                fontWeight: 800,
                                border: "none",
                                cursor: "pointer",
                                boxShadow: "0 2px 6px rgba(46, 125, 91, 0.2)",
                              }}
                            >
                              <CheckCircle size={14} />
                              Approve
                            </button>

                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(partner, "REJECTED")}
                              style={{
                                padding: "7px 12px",
                                borderRadius: "8px",
                                border: "1px solid #BE4436",
                                background: "#FFFFFF",
                                color: "#BE4436",
                                fontSize: "12px",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              Reject
                            </button>
                          </div>
                        ) : isVerified ? (
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "11px", color: "#2E7D5B", fontWeight: 700 }}>
                              ✓ Active Rider
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(partner.partnerId!, `share-${partner.id}`)}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "5px 9px",
                                borderRadius: "6px",
                                border: "1px solid #E3DDCF",
                                background: "#F6F2EA",
                                color: "#1F4D46",
                                fontSize: "11px",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              <Share2 size={12} />
                              Share ID
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(partner, "VERIFIED")}
                            style={{
                              padding: "6px 12px",
                              borderRadius: "7px",
                              border: "1px solid #1F4D46",
                              background: "#FFFFFF",
                              color: "#1F4D46",
                              fontSize: "12px",
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            Re-Approve
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Driving Licence Inspection Modal */}
      {previewPhoto && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(15, 46, 41, 0.75)",
            backdropFilter: "blur(4px)",
            display: "grid",
            placeItems: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "600px",
              background: "#FFFFFF",
              borderRadius: "18px",
              padding: "24px",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.4)",
              display: "grid",
              gap: "16px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "18px", color: "#0F2E29" }}>
                  Driving Licence Inspection
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#5C6B66" }}>
                  {previewPhoto.partnerName} · {previewPhoto.phone}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                style={{
                  border: "none",
                  background: "#F6F2EA",
                  borderRadius: "50%",
                  width: "32px",
                  height: "32px",
                  cursor: "pointer",
                  fontWeight: 700,
                  color: "#1F4D46",
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                borderRadius: "12px",
                overflow: "hidden",
                border: "1px solid #E3DDCF",
                background: "#0F2E29",
                minHeight: "260px",
                display: "grid",
                placeItems: "center",
              }}
            >
              {previewPhoto.url.startsWith("data:") || previewPhoto.url.startsWith("http") ? (
                <img
                  src={previewPhoto.url}
                  alt="Driving Licence"
                  style={{ width: "100%", maxHeight: "420px", objectFit: "contain" }}
                />
              ) : (
                <div style={{ padding: "40px", textAlign: "center", color: "#FFFFFF" }}>
                  <FileText size={48} style={{ margin: "0 auto 12px", opacity: 0.6 }} />
                  <p style={{ fontSize: "13px", margin: 0 }}>Document Reference: {previewPhoto.url}</p>
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                style={{
                  padding: "9px 18px",
                  borderRadius: "8px",
                  background: "#1F4D46",
                  color: "#FFFFFF",
                  fontSize: "13px",
                  fontWeight: 800,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Done Inspecting
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approval Success & 6-Digit ID Display Modal */}
      {approvalModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(15, 46, 41, 0.75)",
            backdropFilter: "blur(4px)",
            display: "grid",
            placeItems: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "480px",
              background: "#FFFFFF",
              borderRadius: "20px",
              padding: "32px 28px",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.4)",
              textAlign: "center",
              position: "relative",
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "#E3F1E9",
                color: "#2E7D5B",
                display: "grid",
                placeItems: "center",
                margin: "0 auto 16px",
              }}
            >
              <ShieldCheck size={32} />
            </div>

            <h3
              style={{
                fontFamily: "'Fraunces', serif",
                fontSize: "22px",
                color: "#0F2E29",
                margin: "0 0 6px 0",
              }}
            >
              Delivery Partner Approved!
            </h3>
            <p style={{ fontSize: "13px", color: "#5C6B66", margin: "0 0 20px 0" }}>
              Share this unique 6-digit Partner Access ID with{" "}
              <strong>{approvalModal.partner.user?.name || "the rider"}</strong> ({approvalModal.partner.user?.phone}) so they can sign in to the delivery app.
            </p>

            {/* Prominent 6-Digit ID Box */}
            <div
              style={{
                background: "#F6F2EA",
                border: "2px dashed #2E7D5B",
                borderRadius: "14px",
                padding: "20px",
                marginBottom: "24px",
              }}
            >
              <div style={{ fontSize: "11px", fontWeight: 800, color: "#1F4D46", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>
                6-Digit Partner Access ID
              </div>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: "36px",
                  fontWeight: 900,
                  color: "#0F2E29",
                  letterSpacing: "4px",
                }}
              >
                {approvalModal.partnerId}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <button
                type="button"
                onClick={() => {
                  const shareMsg = `FreshGo Delivery: Your application has been approved! Use your mobile number (${approvalModal.partner.user?.phone}) and Partner Access ID: ${approvalModal.partnerId} to login at the rider portal.`;
                  copyToClipboard(shareMsg, "share-msg");
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "12px",
                  borderRadius: "10px",
                  border: "1px solid #1F4D46",
                  background: "#E4ECE9",
                  color: "#1F4D46",
                  fontSize: "13px",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                <Copy size={16} />
                Copy Full Message
              </button>

              <button
                type="button"
                onClick={() => setApprovalModal(null)}
                style={{
                  padding: "12px",
                  borderRadius: "10px",
                  background: "#1F4D46",
                  color: "#FFFFFF",
                  fontSize: "13px",
                  fontWeight: 800,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
