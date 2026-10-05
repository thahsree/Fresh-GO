"use client";

import { useState, useEffect } from "react";
import { api, Hub } from "../../lib/api";
import { GoogleMapsPicker } from "./GoogleMapsPicker";
import {
  MapPin,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Search,
  Phone,
  Radio,
  UserCheck,
  RefreshCw,
  Building,
  AlertTriangle,
  KeyRound,
  Copy,
  Check,
  Lock,
} from "lucide-react";

type HubFormData = {
  name: string;
  code: string;
  city: string;
  address: string;
  contactPhone: string;
  deliveryRadiusKm: number;
  latitude: number;
  longitude: number;
  isActive: boolean;
};

const initialFormData: HubFormData = {
  name: "",
  code: "",
  city: "Kozhikode",
  address: "",
  contactPhone: "",
  deliveryRadiusKm: 10,
  latitude: 11.2588,
  longitude: 75.7804,
  isActive: true,
};

export function HubsManagementView({
  onToast,
}: {
  onToast: (msg: string, type?: "success" | "error" | "info" | "delete") => void;
}) {
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingHubId, setEditingHubId] = useState<string | null>(null);
  const [formData, setFormData] = useState<HubFormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [deletingHub, setDeletingHub] = useState<Hub | null>(null);

  // Hub Admin Password & Credentials State
  const [credentialsHub, setCredentialsHub] = useState<Hub | null>(null);
  const [hubPasswordInput, setHubPasswordInput] = useState("");
  const [hubAdminPhoneInput, setHubAdminPhoneInput] = useState("");
  const [generatingPassword, setGeneratingPassword] = useState(false);
  const [copiedCredential, setCopiedCredential] = useState(false);
  const [passwordSuccessMessage, setPasswordSuccessMessage] = useState<string | null>(null);

  const openCredentialsModal = (hub: Hub) => {
    setCredentialsHub(hub);
    setHubPasswordInput(hub.adminPasswordRaw || "");
    setHubAdminPhoneInput(hub.admins?.[0]?.phone || hub.contactPhone || "+919999999999");
    setPasswordSuccessMessage(null);
    setCopiedCredential(false);
  };

  const handleGenerateSavePassword = async (generateRandom = false) => {
    if (!credentialsHub) return;
    setGeneratingPassword(true);
    setPasswordSuccessMessage(null);
    try {
      let pwdToSend = hubPasswordInput.trim();
      if (generateRandom || !pwdToSend) {
        const rand = Math.floor(1000 + Math.random() * 9000);
        pwdToSend = `FreshGo@${credentialsHub.code.replace(/[^a-zA-Z0-9]/g, "")}${rand}`;
      }

      const res = await api.hubs.setAdminPassword(credentialsHub.id, {
        password: pwdToSend,
        adminPhone: hubAdminPhoneInput.trim() || undefined,
      });

      setHubPasswordInput(res.password || pwdToSend);
      setPasswordSuccessMessage(`Credentials updated successfully! Hub Phone: ${res.hubNumber}`);
      onToast(`Admin credentials generated for ${credentialsHub.name}`, "success");
      fetchHubs();
    } catch (err: any) {
      onToast(err?.message || "Failed to update hub admin password", "error");
    } finally {
      setGeneratingPassword(false);
    }
  };

  const copyCredentialsToClipboard = () => {
    if (!credentialsHub) return;
    const phone = hubAdminPhoneInput || credentialsHub.contactPhone || "+919999999999";
    const text = `FreshGo Hub Admin Credentials:\nHub: ${credentialsHub.name} (${credentialsHub.code})\nLogin Identifier: ${phone} (or ${credentialsHub.code})\nPassword: ${hubPasswordInput}`;
    navigator.clipboard.writeText(text);
    setCopiedCredential(true);
    setTimeout(() => setCopiedCredential(false), 3000);
    onToast("Credentials copied to clipboard!", "info");
  };

  const fetchHubs = async () => {
    setLoading(true);
    try {
      const data = await api.hubs.getAll();
      setHubs(data || []);
    } catch (err: any) {
      onToast(err?.message || "Failed to load hubs", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHubs();
  }, []);

  const openCreateModal = () => {
    // Generate next hub code suggestion
    const nextNum = hubs.length + 1;
    const suggestedCode = `HUB-CLT-${nextNum < 10 ? "0" + nextNum : nextNum}`;

    setFormData({
      ...initialFormData,
      code: suggestedCode,
    });
    setEditingHubId(null);
    setModalMode("create");
  };

  const openEditModal = (hub: Hub) => {
    setFormData({
      name: hub.name,
      code: hub.code,
      city: hub.city || "Kozhikode",
      address: hub.address,
      contactPhone: hub.contactPhone || "",
      deliveryRadiusKm: hub.deliveryRadiusKm || 10,
      latitude: hub.latitude,
      longitude: hub.longitude,
      isActive: hub.isActive,
    });
    setEditingHubId(hub.id);
    setModalMode("edit");
  };

  const handleSaveHub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim() || !formData.address.trim()) {
      onToast("Please fill in Hub Name, Code, and Address.", "error");
      return;
    }

    setSaving(true);
    try {
      if (modalMode === "create") {
        await api.hubs.create({
          name: formData.name.trim(),
          code: formData.code.trim().toUpperCase(),
          city: formData.city.trim(),
          address: formData.address.trim(),
          contactPhone: formData.contactPhone.trim() || undefined,
          deliveryRadiusKm: formData.deliveryRadiusKm,
          latitude: formData.latitude,
          longitude: formData.longitude,
          isActive: formData.isActive,
        });
        onToast(
          `Hub "${formData.name}" added successfully! Assigned Admin: "${formData.name} Admin"`,
          "success"
        );
      } else if (modalMode === "edit" && editingHubId) {
        await api.hubs.update(editingHubId, {
          name: formData.name.trim(),
          code: formData.code.trim().toUpperCase(),
          city: formData.city.trim(),
          address: formData.address.trim(),
          contactPhone: formData.contactPhone.trim() || undefined,
          deliveryRadiusKm: formData.deliveryRadiusKm,
          latitude: formData.latitude,
          longitude: formData.longitude,
          isActive: formData.isActive,
        });
        onToast(`Hub "${formData.name}" updated successfully!`, "success");
      }
      setModalMode(null);
      await fetchHubs();
    } catch (err: any) {
      onToast(err?.message || "Failed to save hub details", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (hub: Hub) => {
    try {
      await api.hubs.update(hub.id, { isActive: !hub.isActive });
      onToast(
        `Hub ${hub.name} set to ${!hub.isActive ? "ACTIVE" : "INACTIVE"}`,
        "info"
      );
      await fetchHubs();
    } catch (err: any) {
      onToast(err?.message || "Failed to update hub status", "error");
    }
  };

  const handleDeleteHub = async () => {
    if (!deletingHub) return;
    try {
      await api.hubs.delete(deletingHub.id);
      onToast(`Hub "${deletingHub.name}" removed successfully`, "delete");
      setDeletingHub(null);
      await fetchHubs();
    } catch (err: any) {
      onToast(err?.message || "Cannot delete hub with active orders", "error");
    }
  };

  const filteredHubs = hubs.filter(
    (h) =>
      h.name.toLowerCase().includes(search.toLowerCase()) ||
      h.code.toLowerCase().includes(search.toLowerCase()) ||
      h.city.toLowerCase().includes(search.toLowerCase()) ||
      h.address.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: "grid", gap: "20px" }}>
      {/* Top Banner Toolbar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "14px",
          background: "#FFFFFF",
          padding: "18px 24px",
          borderRadius: "14px",
          border: "1px solid #E3DDCF",
        }}
      >
        <div>
          <h2
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: "22px",
              color: "#0F2E29",
              margin: 0,
            }}
          >
            Fulfillment Hubs & Geo-Fences
          </h2>
          <p style={{ fontSize: "13px", color: "#5C6B66", marginTop: "4px" }}>
            Super Admin Governance: Manage dispatch centers, 10km express delivery
            zones, and hub administrators.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
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
              placeholder="Search hubs..."
              style={{
                padding: "9px 12px 9px 36px",
                borderRadius: "8px",
                border: "1px solid #E3DDCF",
                fontSize: "13px",
                outline: "none",
                minWidth: "220px",
              }}
            />
          </div>

          <button
            onClick={fetchHubs}
            title="Refresh Hubs"
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

          <button
            onClick={openCreateModal}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              borderRadius: "999px",
              background: "#1F4D46",
              color: "#FFFFFF",
              fontSize: "13px",
              fontWeight: 800,
              border: "none",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(31, 77, 70, 0.25)",
            }}
          >
            <Plus size={16} />
            Add New Hub
          </button>
        </div>
      </div>

      {/* Hubs Table Card */}
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "14px",
          border: "1px solid #E3DDCF",
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#F6F2EA", borderBottom: "1px solid #E3DDCF" }}>
                <th style={{ padding: "14px 18px", textAlign: "left", color: "#1F4D46", fontWeight: 700 }}>
                  Hub Details
                </th>
                <th style={{ padding: "14px 16px", textAlign: "left", color: "#1F4D46", fontWeight: 700 }}>
                  Location & Address
                </th>
                <th style={{ padding: "14px 16px", textAlign: "left", color: "#1F4D46", fontWeight: 700 }}>
                  Delivery Radius
                </th>
                <th style={{ padding: "14px 16px", textAlign: "left", color: "#1F4D46", fontWeight: 700 }}>
                  Assigned Hub Admin
                </th>
                <th style={{ padding: "14px 16px", textAlign: "center", color: "#1F4D46", fontWeight: 700 }}>
                  Status
                </th>
                <th style={{ padding: "14px 18px", textAlign: "right", color: "#1F4D46", fontWeight: 700 }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "#8B968F" }}>
                    Loading fulfillment hubs...
                  </td>
                </tr>
              ) : filteredHubs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "#8B968F" }}>
                    No fulfillment hubs found. Click "Add New Hub" to create one.
                  </td>
                </tr>
              ) : (
                filteredHubs.map((hub) => {
                  const adminName =
                    hub.admins?.[0]?.name || `${hub.name} Admin`;
                  const adminPhone = hub.admins?.[0]?.phone || "Auto-assigned";

                  return (
                    <tr
                      key={hub.id}
                      style={{
                        borderBottom: "1px solid #EFEAE0",
                        transition: "background 0.15s ease",
                      }}
                    >
                      <td style={{ padding: "14px 18px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div
                            style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "8px",
                              background: "#E4ECE9",
                              color: "#1F4D46",
                              display: "grid",
                              placeItems: "center",
                              fontWeight: 800,
                              fontSize: "14px",
                            }}
                          >
                            <Building size={18} />
                          </div>
                          <div>
                            <strong style={{ display: "block", color: "#0F2E29", fontSize: "14px" }}>
                              {hub.name}
                            </strong>
                            <span
                              style={{
                                display: "inline-block",
                                fontSize: "11px",
                                fontWeight: 800,
                                color: "#5C6B66",
                                background: "#F6F2EA",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                marginTop: "2px",
                              }}
                            >
                              {hub.code}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ color: "#17211E", fontWeight: 600 }}>{hub.city}</div>
                        <div style={{ color: "#5C6B66", fontSize: "11px" }}>{hub.address}</div>
                        <div style={{ color: "#8B968F", fontSize: "10px", marginTop: "2px" }}>
                          📍 {hub.latitude.toFixed(4)}, {hub.longitude.toFixed(4)}
                        </div>
                      </td>

                      <td style={{ padding: "14px 16px" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            padding: "4px 9px",
                            borderRadius: "999px",
                            background: "#E3F1E9",
                            color: "#2E7D5B",
                            fontWeight: 800,
                            fontSize: "12px",
                          }}
                        >
                          <Radio size={13} />
                          {hub.deliveryRadiusKm || 10} km
                        </span>
                      </td>

                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <UserCheck size={14} color="#1F4D46" />
                          <span style={{ fontWeight: 700, color: "#1F4D46" }}>
                            {adminName}
                          </span>
                        </div>
                        <small style={{ color: "#8B968F", fontSize: "11px", display: "block" }}>
                          {adminPhone}
                        </small>
                      </td>

                      <td style={{ padding: "14px 16px", textAlign: "center" }}>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(hub)}
                          style={{
                            border: "none",
                            background: "transparent",
                            cursor: "pointer",
                            padding: 0,
                          }}
                          title="Click to toggle status"
                        >
                          {hub.isActive ? (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "4px 8px",
                                borderRadius: "999px",
                                background: "#E3F1E9",
                                color: "#2E7D5B",
                                fontSize: "11px",
                                fontWeight: 800,
                              }}
                            >
                              <CheckCircle size={13} />
                              Active
                            </span>
                          ) : (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "4px 8px",
                                borderRadius: "999px",
                                background: "#FBE7E3",
                                color: "#BE4436",
                                fontSize: "11px",
                                fontWeight: 800,
                              }}
                            >
                              <XCircle size={13} />
                              Inactive
                            </span>
                          )}
                        </button>
                      </td>

                      <td style={{ padding: "14px 18px", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                          <button
                            onClick={() => openCredentialsModal(hub)}
                            title="Generate or view Hub Admin Password"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "6px 10px",
                              borderRadius: "7px",
                              border: "1px solid #1F4D46",
                              background: "#E4ECE9",
                              color: "#1F4D46",
                              fontSize: "12px",
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            <KeyRound size={13} />
                            Password
                          </button>
                          <button
                            onClick={() => openEditModal(hub)}
                            title="Edit Hub"
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "7px",
                              border: "1px solid #E3DDCF",
                              background: "#FFFFFF",
                              color: "#1F4D46",
                              display: "grid",
                              placeItems: "center",
                              cursor: "pointer",
                            }}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => setDeletingHub(hub)}
                            title="Delete Hub"
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "7px",
                              border: "1px solid #E3DDCF",
                              background: "#FFFFFF",
                              color: "#BE4436",
                              display: "grid",
                              placeItems: "center",
                              cursor: "pointer",
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add or Edit Hub */}
      {modalMode && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(15, 46, 41, 0.65)",
            backdropFilter: "blur(4px)",
            display: "grid",
            placeItems: "center",
            padding: "20px",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "760px",
              background: "#FFFFFF",
              borderRadius: "18px",
              padding: "28px",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.3)",
              display: "grid",
              gap: "20px",
              maxHeight: "92vh",
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3
                  style={{
                    fontFamily: "'Fraunces', serif",
                    fontSize: "22px",
                    color: "#0F2E29",
                    margin: 0,
                  }}
                >
                  {modalMode === "create" ? "Add New Fulfillment Hub" : "Edit Fulfillment Hub"}
                </h3>
                <p style={{ fontSize: "12px", color: "#5C6B66", margin: "4px 0 0" }}>
                  Configure dispatch epicenter, coordinates, 10km express geo-fence, and hub admin.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalMode(null)}
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

            <form onSubmit={handleSaveHub} style={{ display: "grid", gap: "16px" }}>
              {/* Basic Fields Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "#1F4D46", marginBottom: "6px" }}>
                    HUB NAME *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Kozhikode Beach Hub"
                    required
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid #E3DDCF",
                      fontSize: "13px",
                      outline: "none",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "#1F4D46", marginBottom: "6px" }}>
                    HUB CODE *
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. HUB-CLT-02"
                    required
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid #E3DDCF",
                      fontSize: "13px",
                      textTransform: "uppercase",
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "#1F4D46", marginBottom: "6px" }}>
                    CITY *
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Kozhikode"
                    required
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid #E3DDCF",
                      fontSize: "13px",
                      outline: "none",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "#1F4D46", marginBottom: "6px" }}>
                    CONTACT PHONE
                  </label>
                  <input
                    type="text"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    placeholder="+919846000000"
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid #E3DDCF",
                      fontSize: "13px",
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "#1F4D46", marginBottom: "6px" }}>
                  FULL ADDRESS *
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street name, landmark, postal code"
                  required
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #E3DDCF",
                    fontSize: "13px",
                    outline: "none",
                  }}
                />
              </div>

              {/* Hub Admin Location Branding Auto-Preview */}
              <div
                style={{
                  background: "#E4ECE9",
                  padding: "12px 14px",
                  borderRadius: "10px",
                  border: "1px solid #C5D8D3",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <UserCheck size={24} color="#1F4D46" />
                <div>
                  <div style={{ fontSize: "11px", color: "#5C6B66", fontWeight: 700 }}>
                    AUTO-BRANDED HUB ADMIN NAME:
                  </div>
                  <strong style={{ fontSize: "14px", color: "#1F4D46" }}>
                    {formData.name.trim() ? `${formData.name.trim()} Admin` : "Location Hub Admin"}
                  </strong>
                  <div style={{ fontSize: "10px", color: "#5C6B66" }}>
                    Hub administrators will be automatically named and scoped to this hub location.
                  </div>
                </div>
              </div>

              {/* Interactive Google Maps Picker with 10km Radius */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "11px",
                    fontWeight: 800,
                    color: "#1F4D46",
                    marginBottom: "6px",
                  }}
                >
                  MAP PINPOINT & 10KM GEO-FENCE COVERAGE
                </label>
                <GoogleMapsPicker
                  initialLat={formData.latitude}
                  initialLng={formData.longitude}
                  radiusKm={formData.deliveryRadiusKm}
                  onLocationSelect={(newLat, newLng, address) => {
                    setFormData((prev) => ({
                      ...prev,
                      latitude: newLat,
                      longitude: newLng,
                      address: address || prev.address,
                    }));
                  }}
                  onRadiusChange={(newRadius) => {
                    setFormData((prev) => ({ ...prev, deliveryRadiusKm: newRadius }));
                  }}
                />
              </div>

              {/* Active Toggle */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <input
                  type="checkbox"
                  id="hubActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  style={{ accentColor: "#1F4D46", width: "16px", height: "16px" }}
                />
                <label htmlFor="hubActive" style={{ fontSize: "13px", fontWeight: 700, color: "#1F4D46" }}>
                  Active for Express Delivery (Orders dispatched from this hub)
                </label>
              </div>

              {/* Submit Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  style={{
                    padding: "10px 18px",
                    borderRadius: "8px",
                    border: "1px solid #E3DDCF",
                    background: "#FFFFFF",
                    color: "#5C6B66",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: "10px 22px",
                    borderRadius: "8px",
                    background: "#1F4D46",
                    color: "#FFFFFF",
                    fontSize: "13px",
                    fontWeight: 800,
                    border: "none",
                    cursor: saving ? "not-allowed" : "pointer",
                    boxShadow: "0 4px 12px rgba(31, 77, 70, 0.25)",
                  }}
                >
                  {saving
                    ? "Saving..."
                    : modalMode === "create"
                    ? "Create Hub"
                    : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingHub && (
        <div className="delete-modal-backdrop">
          <div className="delete-modal-card">
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "10px",
                  background: "#FBE7E3",
                  color: "#BE4436",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <AlertTriangle size={22} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: "16px", color: "#0F2E29" }}>Delete Fulfillment Hub?</h4>
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#5C6B66" }}>
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <p style={{ fontSize: "13px", color: "#17211E", marginBottom: "20px" }}>
              Are you sure you want to delete <strong>{deletingHub.name}</strong> ({deletingHub.code})? Customers within its 10km zone will no longer be serviced by this hub.
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setDeletingHub(null)}
                style={{
                  padding: "9px 16px",
                  borderRadius: "8px",
                  border: "1px solid #E3DDCF",
                  background: "#FFFFFF",
                  color: "#5C6B66",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteHub}
                style={{
                  padding: "9px 18px",
                  borderRadius: "8px",
                  background: "#BE4436",
                  color: "#FFFFFF",
                  fontSize: "13px",
                  fontWeight: 800,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Yes, Delete Hub
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hub Admin Password Generator Modal */}
      {credentialsHub && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(15, 46, 41, 0.65)",
            backdropFilter: "blur(4px)",
            display: "grid",
            placeItems: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "520px",
              background: "#FFFFFF",
              borderRadius: "18px",
              padding: "28px",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.3)",
              display: "grid",
              gap: "20px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "12px",
                    background: "#E4ECE9",
                    color: "#1F4D46",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <KeyRound size={22} />
                </div>
                <div>
                  <h3
                    style={{
                      fontFamily: "'Fraunces', serif",
                      fontSize: "20px",
                      color: "#0F2E29",
                      margin: 0,
                    }}
                  >
                    Hub Admin Credentials
                  </h3>
                  <p style={{ fontSize: "12px", color: "#5C6B66", margin: "2px 0 0" }}>
                    {credentialsHub.name} · {credentialsHub.code}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCredentialsHub(null)}
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

            {passwordSuccessMessage && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  background: "#E3F1E9",
                  color: "#2E7D5B",
                  fontSize: "12px",
                  fontWeight: 600,
                }}
              >
                ✓ {passwordSuccessMessage}
              </div>
            )}

            <div style={{ display: "grid", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "#1F4D46", marginBottom: "6px" }}>
                  HUB ADMIN PHONE NUMBER (LOGIN IDENTIFIER)
                </label>
                <input
                  type="text"
                  value={hubAdminPhoneInput}
                  onChange={(e) => setHubAdminPhoneInput(e.target.value)}
                  placeholder="+919999999999"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #D1D5DB",
                    fontSize: "13px",
                    fontWeight: 600,
                    boxSizing: "border-box",
                  }}
                />
                <small style={{ color: "#8B968F", fontSize: "11px", display: "block", marginTop: "4px" }}>
                  Hub admins can log in using either this phone number or hub code: <strong>{credentialsHub.code}</strong>
                </small>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label style={{ fontSize: "11px", fontWeight: 800, color: "#1F4D46" }}>
                    HUB ADMIN PASSWORD
                  </label>
                  <button
                    type="button"
                    onClick={() => handleGenerateSavePassword(true)}
                    disabled={generatingPassword}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#E5623E",
                      fontSize: "11px",
                      fontWeight: 700,
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    🎲 Auto-Generate Strong Password
                  </button>
                </div>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    value={hubPasswordInput}
                    onChange={(e) => setHubPasswordInput(e.target.value)}
                    placeholder="Enter or generate password"
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid #D1D5DB",
                      fontSize: "14px",
                      fontWeight: 700,
                      fontFamily: "monospace",
                      boxSizing: "border-box",
                      background: "#F9FAF9",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", marginTop: "6px" }}>
              <button
                type="button"
                onClick={copyCredentialsToClipboard}
                disabled={!hubPasswordInput}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "10px 16px",
                  borderRadius: "8px",
                  border: "1px solid #E3DDCF",
                  background: "#F6F2EA",
                  color: "#1F4D46",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: !hubPasswordInput ? "not-allowed" : "pointer",
                }}
              >
                {copiedCredential ? <Check size={16} color="#2E7D5B" /> : <Copy size={16} />}
                {copiedCredential ? "Copied!" : "Copy Credentials"}
              </button>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setCredentialsHub(null)}
                  style={{
                    padding: "10px 16px",
                    borderRadius: "8px",
                    border: "1px solid #E3DDCF",
                    background: "#FFFFFF",
                    color: "#5C6B66",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => handleGenerateSavePassword(false)}
                  disabled={generatingPassword || !hubPasswordInput.trim()}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "8px",
                    background: "#1F4D46",
                    color: "#FFFFFF",
                    fontSize: "13px",
                    fontWeight: 800,
                    border: "none",
                    cursor: generatingPassword || !hubPasswordInput.trim() ? "not-allowed" : "pointer",
                  }}
                >
                  {generatingPassword ? "Saving..." : "Save Password"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
