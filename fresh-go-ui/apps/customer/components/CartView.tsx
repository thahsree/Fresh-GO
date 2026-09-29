import { colors } from "@fresh-food/design-tokens";
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Clock,
  Home,
  LogIn,
  MapPin,
  Minus,
  Navigation,
  Plus,
  PlusCircle,
  ShoppingBag,
  Tag,
  Trash2,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { Product } from "../models/catalog";
import { customerApi, BackendAddress } from "../lib/api";
import { reverseGeocodeLocation } from "../lib/location";
import { dispatchOrderNotification } from "../lib/notifications";
import { OrderCountdownModal } from "./OrderCountdownModal";

export type CartItem = {
  productId: string;
  quantity: number;
  selectedCut?: string;
};

type CartViewProps = {
  cart: { [productId: string]: number };
  products?: Product[];
  deliveryAddress?: string; // backwards compatibility fallback
  deliveryLocation?: string; // GPS zone / city
  deliveryCoords?: { lat: number; lng: number };
  deliveryPincode?: string;
  onOpenLocationPicker?: () => void;
  isLoggedIn?: boolean;
  onOpenAuth?: () => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onExploreProducts: () => void;
  onPlaceOrder: (order: {
    items: { product: Product; quantity: number }[];
    total: number;
    paymentMethod: "cod" | "upi";
    address: string;
    addressId?: string;
    addressDetails?: {
      title?: string;
      houseBuilding: string;
      street: string;
      landmark?: string;
      area: string;
      city: string;
      pincode?: string;
      latitude?: number;
      longitude?: number;
    };
  }) => void;
};

export function CartView({
  cart,
  products = [],
  deliveryAddress: initialDeliveryAddress,
  deliveryLocation: propDeliveryLocation,
  deliveryCoords,
  deliveryPincode,
  onOpenLocationPicker,
  isLoggedIn = false,
  onOpenAuth,
  onUpdateQuantity,
  onRemoveItem,
  onExploreProducts,
  onPlaceOrder,
}: CartViewProps) {
  const [couponCode, setCouponCode] = useState("FRESH50");
  const [couponApplied, setCouponApplied] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "upi">("cod");

  // Delivery Location (Macro GPS Zone)
  const activeLocation =
    propDeliveryLocation || initialDeliveryAddress || "Select Delivery Zone";

  // Saved Doorstep Addresses from backend
  const [savedAddresses, setSavedAddresses] = useState<BackendAddress[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(false);

  // Doorstep Address Form Fields
  const [formTag, setFormTag] = useState<"Home" | "Work" | "Other">("Home");
  const [formHouseBuilding, setFormHouseBuilding] = useState("");
  const [formStreet, setFormStreet] = useState("");
  const [formLandmark, setFormLandmark] = useState("");
  const [formArea, setFormArea] = useState(activeLocation);
  const [formPincode, setFormPincode] = useState(deliveryPincode || "");
  const [addressError, setAddressError] = useState<string | null>(null);

  // Fetch saved addresses from backend when logged in
  useEffect(() => {
    let isMounted = true;
    const fetchSavedAddresses = async () => {
      if (!isLoggedIn) {
        setSavedAddresses([]);
        setIsAddingNewAddress(true);
        return;
      }
      setIsLoadingAddresses(true);
      try {
        const list = await customerApi.getAddresses();
        if (isMounted) {
          if (Array.isArray(list) && list.length > 0) {
            setSavedAddresses(list);
            const def = list.find((a) => a.isDefault) || list[0];
            setSelectedAddressId(def.id);
            setIsAddingNewAddress(false);
          } else {
            setSavedAddresses([]);
            setIsAddingNewAddress(true);
          }
        }
      } catch {
        if (isMounted) {
          setSavedAddresses([]);
          setIsAddingNewAddress(true);
        }
      } finally {
        if (isMounted) setIsLoadingAddresses(false);
      }
    };

    fetchSavedAddresses();
    return () => {
      isMounted = false;
    };
  }, [isLoggedIn]);

  // Keep area and exact local pincode synced when GPS location changes
  useEffect(() => {
    if (activeLocation && activeLocation !== "Select Delivery Zone") {
      setFormArea(activeLocation);
    }
    if (deliveryPincode && deliveryPincode.trim().length === 6) {
      setFormPincode(deliveryPincode.trim());
    } else if (deliveryCoords?.lat && deliveryCoords?.lng) {
      reverseGeocodeLocation(deliveryCoords.lat, deliveryCoords.lng)
        .then((geo) => {
          if (geo.pincode && geo.pincode.length === 6) {
            setFormPincode(geo.pincode);
          }
        })
        .catch(() => {});
    }
  }, [activeLocation, deliveryPincode, deliveryCoords?.lat, deliveryCoords?.lng]);

  // 5-Second Animated Countdown Confirmation State
  const [isCountdownOpen, setIsCountdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingCheckout, setPendingCheckout] = useState<{
    addressId?: string;
    addressDetails?: {
      title?: string;
      houseBuilding: string;
      street: string;
      landmark?: string;
      area: string;
      city: string;
      pincode?: string;
      latitude?: number;
      longitude?: number;
    };
    addressText: string;
  } | null>(null);

  const cartEntries = Object.entries(cart).filter(([_, qty]) => qty > 0);
  const itemsWithProduct = cartEntries
    .map(([id, qty]) => {
      const product = products.find((p) => p.id === id || p.slug === id);
      return product ? { product, quantity: qty } : null;
    })
    .filter(
      (item): item is { product: Product; quantity: number } => item !== null,
    );

  const stockExceededItems = itemsWithProduct.filter(
    ({ product, quantity }) =>
      (product.availableStockKg !== undefined && quantity > product.availableStockKg) ||
      (product.isInStock === false) ||
      (product.availableStockKg !== undefined && product.availableStockKg <= 0)
  );
  const hasStockIssue = stockExceededItems.length > 0;

  const itemsTotal = itemsWithProduct.reduce(
    (sum, { product, quantity }) => sum + product.price * quantity,
    0,
  );

  const deliveryFee = itemsTotal >= 499 || itemsTotal === 0 ? 0 : 40;
  const handlingFee = itemsTotal > 0 ? 15 : 0;
  const discount = couponApplied ? Math.min(50, itemsTotal) : 0;
  const grandTotal = Math.max(0, itemsTotal + deliveryFee + handlingFee - discount);

  const handleApplyCoupon = () => {
    if (couponCode.trim().toUpperCase() === "FRESH50") {
      setCouponApplied(true);
    }
  };

  const handleInitiateCheckout = () => {
    if (itemsWithProduct.length === 0 || isSubmitting || isCountdownOpen) return;
    if (hasStockIssue) {
      dispatchOrderNotification({
        orderId: "STOCK",
        status: "cancelled",
        title: "Stock Limit Exceeded",
        message:
          "Some items in your cart exceed available stock. Please adjust quantities to continue.",
      });
      return;
    }

    if (!isLoggedIn) {
      if (onOpenAuth) {
        onOpenAuth();
      }
      return;
    }

    setAddressError(null);

    // Validate Doorstep Address Selection or New Entry
    if (!isAddingNewAddress && savedAddresses.length > 0) {
      const selected =
        savedAddresses.find((a) => a.id === selectedAddressId) || savedAddresses[0];
      if (!selected) {
        setAddressError("Please select a delivery address.");
        return;
      }
      const fullText = `${selected.street}, ${selected.area}${
        selected.landmark ? `, Near ${selected.landmark}` : ""
      }, ${selected.city} - ${selected.pincode}`;

      setPendingCheckout({
        addressId: selected.id,
        addressText: fullText,
      });
      setIsCountdownOpen(true);
    } else {
      // Validate New Address Form
      if (!formHouseBuilding.trim()) {
        setAddressError("Please enter your House / Flat / Building name.");
        return;
      }
      if (!formStreet.trim()) {
        setAddressError("Please enter your Street / Road name.");
        return;
      }

      const fullText = `${formHouseBuilding.trim()}, ${formStreet.trim()}${
        formLandmark.trim() ? `, Near ${formLandmark.trim()}` : ""
      }, ${formArea.trim() || activeLocation || "Kerala"}`;

      setPendingCheckout({
        addressDetails: {
          title: formTag,
          houseBuilding: formHouseBuilding.trim(),
          street: formStreet.trim(),
          landmark: formLandmark.trim() || undefined,
          area: formArea.trim() || activeLocation || "Local Area",
          city: "Kerala",
          pincode: formPincode.trim() || "670001",
          latitude: deliveryCoords?.lat,
          longitude: deliveryCoords?.lng,
        },
        addressText: fullText,
      });
      setIsCountdownOpen(true);
    }
  };

  const handleCancelCountdown = () => {
    setIsCountdownOpen(false);
    setIsSubmitting(false);
    dispatchOrderNotification({
      orderId: "CART",
      status: "cancelled",
      title: "Order Placement Cancelled",
      message: "Your fresh catch items are safely kept in your cart.",
    });
  };

  const handleConfirmOrder = () => {
    if (isSubmitting || itemsWithProduct.length === 0 || !pendingCheckout) return;
    setIsSubmitting(true);
    setIsCountdownOpen(false);

    onPlaceOrder({
      items: itemsWithProduct,
      total: grandTotal,
      paymentMethod,
      address: pendingCheckout.addressText,
      addressId: pendingCheckout.addressId,
      addressDetails: pendingCheckout.addressDetails,
    });
  };

  if (itemsWithProduct.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconBg}>
          <ShoppingBag size={48} color={colors.primary} />
        </View>
        <Text style={styles.emptyTitle}>Your Cart is Empty</Text>
        <Text style={styles.emptySubtitle}>
          Looks like you haven't added any fresh seafood or farm meat to your cart yet.
        </Text>
        <Pressable
          style={styles.exploreBtn}
          onPress={onExploreProducts}
          accessibilityRole="button"
        >
          <Text style={styles.exploreBtnText}>Explore Fresh Today</Text>
          <ArrowRight size={16} color="#FFFFFF" />
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {/* Title */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Shopping Cart</Text>
        <Text style={styles.itemCount}>
          {itemsWithProduct.length} {itemsWithProduct.length === 1 ? "item" : "items"}
        </Text>
      </View>

      {/* 1. Delivery Location Banner (GPS Coordinates & Hub Express Area) */}
      <View style={styles.locationCard}>
        <View style={styles.locationLeft}>
          <View style={styles.locationIconBg}>
            <Navigation size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.locationLabelRow}>
              <Text style={styles.locationLabel}>DELIVERY LOCATION (GPS ZONE)</Text>
              <View style={styles.gpsLiveBadge}>
                <View style={styles.gpsLiveDot} />
                <Text style={styles.gpsLiveText}>10km Zone</Text>
              </View>
            </View>
            <Text style={styles.locationTitle} numberOfLines={1} ellipsizeMode="tail">
              {activeLocation}
            </Text>
            {deliveryCoords && (
              <Text style={styles.coordsSubtitle}>
                GPS: {deliveryCoords.lat.toFixed(4)}, {deliveryCoords.lng.toFixed(4)}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.locationRight}>
          {onOpenLocationPicker && (
            <Pressable
              style={styles.changeLocBtn}
              onPress={onOpenLocationPicker}
              accessibilityRole="button"
            >
              <Text style={styles.changeLocBtnText}>Change</Text>
            </Pressable>
          )}
          <View style={styles.etaBadge}>
            <Clock size={11} color={colors.success} />
            <Text style={styles.etaText}>25 mins</Text>
          </View>
        </View>
      </View>

      {/* 2. Cart Items List */}
      <View style={styles.itemsList}>
        {itemsWithProduct.map(({ product, quantity }) => (
          <View key={product.id} style={styles.itemCard}>
            <Image
              source={{ uri: product.image }}
              style={styles.itemImage}
              resizeMode="cover"
            />
            <View style={styles.itemDetails}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {product.name}
                </Text>
                <Pressable
                  onPress={() => onRemoveItem(product.id)}
                  style={styles.removeBtn}
                  accessibilityLabel="Remove item"
                >
                  <Trash2 size={15} color={colors.textSoft} />
                </Pressable>
              </View>
              <Text style={styles.itemPrice}>
                Rs {product.price.toLocaleString()}
                <Text style={styles.itemUnit}> {product.unit}</Text>
              </Text>

              <View style={styles.itemFooter}>
                <View style={styles.stepper}>
                  <Pressable
                    style={styles.stepBtn}
                    onPress={() =>
                      onUpdateQuantity(product.id, Math.max(0, quantity - 1))
                    }
                  >
                    <Minus size={13} color={colors.primaryDark} />
                  </Pressable>
                  <Text style={styles.qtyText}>{quantity}</Text>
                  <Pressable
                    style={styles.stepBtn}
                    onPress={() => {
                      const max =
                        product.availableStockKg !== undefined
                          ? Math.floor(product.availableStockKg)
                          : 99;
                      if (quantity < max) {
                        onUpdateQuantity(product.id, quantity + 1);
                      }
                    }}
                    disabled={
                      product.availableStockKg !== undefined &&
                      quantity >= product.availableStockKg
                    }
                  >
                    <Plus
                      size={13}
                      color={
                        product.availableStockKg !== undefined &&
                        quantity >= product.availableStockKg
                          ? "#CBD5E1"
                          : colors.primaryDark
                      }
                    />
                  </Pressable>
                </View>
                <Text style={styles.lineTotal}>
                  Rs {(product.price * quantity).toLocaleString()}
                </Text>
              </View>

              {product.availableStockKg !== undefined &&
                quantity > product.availableStockKg && (
                  <View
                    style={{
                      marginTop: 6,
                      backgroundColor: "#FBE7E3",
                      padding: 6,
                      borderRadius: 6,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        color: "#BE4436",
                        fontWeight: "700",
                      }}
                    >
                      ⚠️ Exceeds stock! Only {product.availableStockKg}{" "}
                      {product.unit || "kg"} left.
                    </Text>
                  </View>
                )}

              {product.availableStockKg !== undefined &&
                quantity === product.availableStockKg &&
                product.availableStockKg > 0 && (
                  <View style={{ marginTop: 4 }}>
                    <Text
                      style={{
                        fontSize: 10.5,
                        color: "#B45309",
                        fontWeight: "600",
                      }}
                    >
                      Max available stock reached ({product.availableStockKg}{" "}
                      {product.unit || "kg"})
                    </Text>
                  </View>
                )}

              {((product.availableStockKg !== undefined &&
                product.availableStockKg <= 0) ||
                product.isInStock === false) && (
                <View
                  style={{
                    marginTop: 6,
                    backgroundColor: "#FBE7E3",
                    padding: 6,
                    borderRadius: 6,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      color: "#BE4436",
                      fontWeight: "700",
                    }}
                  >
                    ❌ Item is out of stock. Please remove to continue.
                  </Text>
                </View>
              )}
            </View>
          </View>
        ))}
      </View>

      {/* 3. Delivery Address (Doorstep Details: Building Name, House, Street, Landmark) */}
      <View style={styles.addressSection}>
        <View style={styles.addressSectionHeader}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
            <MapPin size={18} color={colors.primary} />
            <View>
              <Text style={styles.sectionHeaderTitle}>Delivery Address (Doorstep)</Text>
              <Text style={styles.sectionHeaderSub}>
                Rider doorstep details: Building, flat & landmark
              </Text>
            </View>
          </View>
          {isLoggedIn && savedAddresses.length > 0 && (
            <Pressable
              style={styles.addressHeaderAction}
              onPress={() => {
                setAddressError(null);
                setIsAddingNewAddress(!isAddingNewAddress);
              }}
            >
              <Text style={styles.addressHeaderActionText}>
                {isAddingNewAddress ? "Use Saved" : "+ Add New"}
              </Text>
            </Pressable>
          )}
        </View>

        {!isLoggedIn ? (
          <View style={styles.authPromptCard}>
            <View style={styles.authPromptTextGroup}>
              <Text style={styles.authPromptTitle}>Sign in to view saved addresses</Text>
              <Text style={styles.authPromptSubtitle}>
                Save multiple addresses (Home, Work) for quick selection at checkout.
              </Text>
            </View>
            {onOpenAuth && (
              <Pressable style={styles.authPromptBtn} onPress={onOpenAuth}>
                <LogIn size={14} color="#FFFFFF" />
                <Text style={styles.authPromptBtnText}>Sign In</Text>
              </Pressable>
            )}
          </View>
        ) : isLoadingAddresses ? (
          <View style={styles.addressLoadingCard}>
            <Text style={styles.addressLoadingText}>Loading your saved addresses...</Text>
          </View>
        ) : savedAddresses.length > 0 && !isAddingNewAddress ? (
          <View style={styles.addressCardsList}>
            <Text style={styles.chooseAddressNotice}>
              Select which address to deliver this order:
            </Text>
            {savedAddresses.map((addr) => {
              const isSelected = (selectedAddressId || savedAddresses[0]?.id) === addr.id;
              const TagIcon =
                addr.title.toLowerCase() === "home"
                  ? Home
                  : addr.title.toLowerCase() === "work"
                  ? Briefcase
                  : MapPin;

              return (
                <Pressable
                  key={addr.id}
                  style={[
                    styles.addressItemCard,
                    isSelected && styles.addressItemCardSelected,
                  ]}
                  onPress={() => {
                    setSelectedAddressId(addr.id);
                    setAddressError(null);
                  }}
                >
                  <View style={styles.addressRadioCol}>
                    <View
                      style={[
                        styles.radioCircle,
                        isSelected && styles.radioCircleSelected,
                      ]}
                    >
                      {isSelected && <View style={styles.radioDot} />}
                    </View>
                  </View>

                  <View style={styles.addressInfoCol}>
                    <View style={styles.addressTagRow}>
                      <View style={styles.addressTagPill}>
                        <TagIcon size={11} color={colors.primaryDark} />
                        <Text style={styles.addressTagText}>{addr.title || "Address"}</Text>
                      </View>
                      {addr.isDefault && (
                        <View style={styles.defaultPill}>
                          <Text style={styles.defaultPillText}>DEFAULT</Text>
                        </View>
                      )}
                      {isSelected && (
                        <View style={styles.selectedPill}>
                          <CheckCircle2 size={11} color={colors.success} />
                          <Text style={styles.selectedPillText}>Selected</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.addressStreetText} numberOfLines={2}>
                      {addr.street}
                    </Text>
                    {addr.landmark ? (
                      <Text style={styles.addressLandmarkText}>
                        📍 Near: {addr.landmark}
                      </Text>
                    ) : null}
                    <Text style={styles.addressAreaText}>
                      {addr.area}, {addr.city} {addr.pincode ? `· ${addr.pincode}` : ""}
                    </Text>
                  </View>
                </Pressable>
              );
            })}

            <Pressable
              style={styles.addNewAddressOutlineBtn}
              onPress={() => {
                setAddressError(null);
                setIsAddingNewAddress(true);
              }}
            >
              <PlusCircle size={15} color={colors.primary} />
              <Text style={styles.addNewAddressOutlineBtnText}>
                Deliver to a different doorstep address
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.addressFormCard}>
            {savedAddresses.length === 0 ? (
              <View style={styles.noAddressInfoBanner}>
                <MapPin size={16} color={colors.primary} />
                <Text style={styles.noAddressInfoText}>
                  Please enter your building name & house details below to complete your order.
                </Text>
              </View>
            ) : (
              <View style={styles.newAddressHeaderRow}>
                <Text style={styles.newAddressFormTitle}>Add New Delivery Address</Text>
                <Pressable
                  onPress={() => {
                    setAddressError(null);
                    setIsAddingNewAddress(false);
                  }}
                >
                  <Text style={styles.backToSavedText}>← Choose from saved</Text>
                </Pressable>
              </View>
            )}

            {/* Tag Pills */}
            <View style={styles.formTagRow}>
              {(["Home", "Work", "Other"] as const).map((tag) => {
                const isSelected = formTag === tag;
                return (
                  <Pressable
                    key={tag}
                    style={[
                      styles.formTagBtn,
                      isSelected && styles.formTagBtnSelected,
                    ]}
                    onPress={() => setFormTag(tag)}
                  >
                    <Text
                      style={[
                        styles.formTagBtnText,
                        isSelected && styles.formTagBtnTextSelected,
                      ]}
                    >
                      {tag === "Home" ? "🏠 Home" : tag === "Work" ? "🏢 Work" : "📍 Other"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* House / Building Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Building / House / Flat No. & Name <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <TextInput
                value={formHouseBuilding}
                onChangeText={(text) => {
                  setFormHouseBuilding(text);
                  if (addressError) setAddressError(null);
                }}
                placeholder="e.g. Flat 4B, Emerald Heights Apt"
                placeholderTextColor={colors.textSoft}
                style={styles.textInput}
              />
            </View>

            {/* Street / Road */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Street / Road / Colony <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <TextInput
                value={formStreet}
                onChangeText={(text) => {
                  setFormStreet(text);
                  if (addressError) setAddressError(null);
                }}
                placeholder="e.g. South Bazaar Road, Near City Mosque"
                placeholderTextColor={colors.textSoft}
                style={styles.textInput}
              />
            </View>

            {/* Landmark */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Landmark (Optional)</Text>
              <TextInput
                value={formLandmark}
                onChangeText={setFormLandmark}
                placeholder="e.g. Opposite City Hospital or Big Banyan Tree"
                placeholderTextColor={colors.textSoft}
                style={styles.textInput}
              />
            </View>

            {/* Area & Pincode Row */}
            <View style={styles.formTwoColRow}>
              <View style={[styles.inputGroup, { flex: 2 }]}>
                <Text style={styles.inputLabel}>Area / Locality</Text>
                <TextInput
                  value={formArea}
                  onChangeText={setFormArea}
                  placeholder="Area"
                  placeholderTextColor={colors.textSoft}
                  style={styles.textInput}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Pincode</Text>
                <TextInput
                  value={formPincode}
                  onChangeText={setFormPincode}
                  placeholder="670001"
                  placeholderTextColor={colors.textSoft}
                  keyboardType="number-pad"
                  style={styles.textInput}
                />
              </View>
            </View>

            <Text style={styles.addressAutoSaveHint}>
              💾 This address will be automatically saved to your profile for future orders.
            </Text>
          </View>
        )}

        {addressError && (
          <View style={styles.addressErrorBanner}>
            <AlertCircle size={15} color="#BE4436" />
            <Text style={styles.addressErrorText}>{addressError}</Text>
          </View>
        )}
      </View>

      {/* 4. Promo Code Section */}
      <View style={styles.couponCard}>
        <View style={styles.couponHeader}>
          <Tag size={16} color={colors.accent} />
          <Text style={styles.couponTitle}>Offers & Coupons</Text>
        </View>
        <View style={styles.couponInputRow}>
          <TextInput
            value={couponCode}
            onChangeText={setCouponCode}
            placeholder="Enter promo code"
            style={styles.couponInput}
            autoCapitalize="characters"
          />
          <Pressable
            style={[
              styles.applyBtn,
              couponApplied && styles.applyBtnApplied,
            ]}
            onPress={handleApplyCoupon}
          >
            <Text style={styles.applyBtnText}>
              {couponApplied ? "Applied ✓" : "Apply"}
            </Text>
          </Pressable>
        </View>
        {couponApplied && (
          <Text style={styles.couponSuccess}>
            🎉 Promo FRESH50 applied! You saved Rs 50.
          </Text>
        )}
      </View>

      {/* 5. Payment Method */}
      <View style={styles.paymentSection}>
        <Text style={styles.sectionHeader}>Payment Method</Text>
        <View style={styles.paymentOptions}>
          <Pressable
            style={[
              styles.paymentOption,
              styles.paymentOptionSelected,
            ]}
            onPress={() => setPaymentMethod("cod")}
          >
            <View style={styles.radio}>
              <View style={styles.radioDot} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.paymentTitle}>Pay on Delivery (Cash / UPI)</Text>
              <Text style={styles.paymentSubtitle}>Pay cash or scan UPI QR directly with rider at doorstep</Text>
            </View>
            <View style={{ backgroundColor: "#EAF6ED", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
              <Text style={{ color: "#198754", fontSize: 11, fontWeight: "700" }}>AVAILABLE</Text>
            </View>
          </Pressable>
        </View>
      </View>

      {/* 6. Bill Details */}
      <View style={styles.billCard}>
        <Text style={styles.sectionHeader}>Bill Details</Text>
        <View style={styles.billRow}>
          <Text style={styles.billLabel}>Item Total</Text>
          <Text style={styles.billVal}>Rs {itemsTotal.toLocaleString()}</Text>
        </View>
        <View style={styles.billRow}>
          <Text style={styles.billLabel}>Delivery Fee</Text>
          <Text style={[styles.billVal, deliveryFee === 0 && styles.freeDelivery]}>
            {deliveryFee === 0 ? "FREE" : `Rs ${deliveryFee}`}
          </Text>
        </View>
        <View style={styles.billRow}>
          <Text style={styles.billLabel}>Handling & Packaging</Text>
          <Text style={styles.billVal}>Rs {handlingFee}</Text>
        </View>
        {couponApplied && (
          <View style={styles.billRow}>
            <Text style={[styles.billLabel, styles.savingText]}>
              Coupon Discount
            </Text>
            <Text style={[styles.billVal, styles.savingText]}>- Rs {discount}</Text>
          </View>
        )}
        <View style={styles.divider} />
        <View style={styles.billRow}>
          <Text style={styles.grandTotalLabel}>To Pay</Text>
          <Text style={styles.grandTotalVal}>Rs {grandTotal.toLocaleString()}</Text>
        </View>
      </View>

      {/* 7. Place Order CTA */}
      <View style={styles.checkoutBar}>
        <View>
          <Text style={styles.checkoutTotalLabel}>Grand Total</Text>
          <Text style={styles.checkoutTotal}>Rs {grandTotal.toLocaleString()}</Text>
        </View>

        {hasStockIssue && (
          <View
            style={{
              padding: 8,
              borderRadius: 8,
              backgroundColor: "#FBE7E3",
              borderWidth: 1,
              borderColor: "#BE4436",
              marginBottom: 8,
              width: "100%",
            }}
          >
            <Text style={{ fontSize: 11.5, color: "#9C2B1F", fontWeight: "700" }}>
              ⚠️ Adjust cart: items exceed available stock.
            </Text>
          </View>
        )}

        <Pressable
          style={[
            styles.placeOrderBtn,
            (isSubmitting || isCountdownOpen || hasStockIssue) &&
              styles.placeOrderBtnDisabled,
          ]}
          onPress={handleInitiateCheckout}
          disabled={isSubmitting || isCountdownOpen || hasStockIssue}
          accessibilityRole="button"
          accessibilityLabel="Place Order"
        >
          <Text style={styles.placeOrderBtnText}>
            {isSubmitting
              ? "Placing Order..."
              : isCountdownOpen
              ? "Confirming..."
              : hasStockIssue
              ? "Stock Exceeded"
              : "Place Order"}
          </Text>
          <ArrowRight size={18} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* 5-Second Animated Countdown Confirmation Modal */}
      <OrderCountdownModal
        visible={isCountdownOpen}
        orderDetails={{
          items: itemsWithProduct,
          total: grandTotal,
          paymentMethod,
          address: pendingCheckout?.addressText || activeLocation,
        }}
        onConfirm={handleConfirmOrder}
        onCancel={handleCancelCountdown}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 28,
  },
  header: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerTitle: {
    color: colors.primaryDark,
    fontSize: 22,
    fontWeight: "800",
  },
  itemCount: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emptyIconBg: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    color: colors.primaryDark,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 8,
  },
  emptySubtitle: {
    color: colors.textMuted,
    fontSize: 13.5,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  exploreBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 999,
  },
  exploreBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  // 1. Delivery Location Card
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    marginBottom: 16,
  },
  locationLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  locationIconBg: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
  locationLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  locationLabel: {
    color: colors.textSoft,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  gpsLiveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  gpsLiveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.success,
  },
  gpsLiveText: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.textSoft,
  },
  locationTitle: {
    color: colors.primaryDark,
    fontSize: 13.5,
    fontWeight: "800",
  },
  coordsSubtitle: {
    color: colors.textMuted,
    fontSize: 10.5,
    marginTop: 2,
  },
  locationRight: {
    alignItems: "flex-end",
    gap: 6,
  },
  changeLocBtn: {
    backgroundColor: colors.surface,
    paddingHorizontal: 11,
    paddingVertical: 4.5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  changeLocBtnText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "700",
  },
  etaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.successTint,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
  },
  etaText: {
    color: colors.success,
    fontSize: 10.5,
    fontWeight: "700",
  },

  // 2. Items List
  itemsList: {
    gap: 12,
    marginBottom: 16,
  },
  itemCard: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 12,
  },
  itemImage: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: colors.primaryTint,
  },
  itemDetails: {
    flex: 1,
    justifyContent: "space-between",
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemName: {
    color: colors.text,
    fontSize: 13.5,
    fontWeight: "700",
    flex: 1,
    marginRight: 8,
  },
  removeBtn: {
    padding: 4,
  },
  itemPrice: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
  },
  itemUnit: {
    color: colors.textSoft,
    fontSize: 11,
    fontWeight: "500",
  },
  itemFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surfaceAlt,
  },
  stepBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  qtyText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "800",
    minWidth: 18,
    textAlign: "center",
  },
  lineTotal: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "800",
  },

  // 3. Delivery Address Section (Doorstep)
  addressSection: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 16,
  },
  addressSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sectionHeaderTitle: {
    color: colors.primaryDark,
    fontSize: 14.5,
    fontWeight: "800",
  },
  sectionHeaderSub: {
    color: colors.textSoft,
    fontSize: 11,
    marginTop: 1,
  },
  addressHeaderAction: {
    backgroundColor: colors.primaryTint,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  addressHeaderActionText: {
    color: colors.primary,
    fontSize: 11.5,
    fontWeight: "700",
  },
  chooseAddressNotice: {
    fontSize: 12,
    color: colors.textSoft,
    fontWeight: "600",
    marginBottom: 10,
  },

  // Address Cards List
  addressCardsList: {
    gap: 10,
  },
  addressItemCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    padding: 12,
    gap: 10,
  },
  addressItemCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint,
  },
  addressRadioCol: {
    paddingTop: 2,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#94A3B8",
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleSelected: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  addressInfoCol: {
    flex: 1,
  },
  addressTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  addressTagPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  addressTagText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  defaultPill: {
    backgroundColor: "#EAF6ED",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultPillText: {
    color: "#198754",
    fontSize: 9.5,
    fontWeight: "800",
  },
  selectedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.successTint,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: "auto",
  },
  selectedPillText: {
    color: colors.success,
    fontSize: 10,
    fontWeight: "700",
  },
  addressStreetText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
    lineHeight: 18,
  },
  addressLandmarkText: {
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: 2,
  },
  addressAreaText: {
    fontSize: 11,
    color: colors.textSoft,
    marginTop: 2,
  },
  addNewAddressOutlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderStyle: "dashed",
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 4,
    backgroundColor: colors.surfaceAlt,
  },
  addNewAddressOutlineBtnText: {
    color: colors.primary,
    fontSize: 12.5,
    fontWeight: "700",
  },

  // Address Form Card
  addressFormCard: {
    backgroundColor: "#FAFAFA",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  noAddressInfoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primaryTint,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  noAddressInfoText: {
    fontSize: 12,
    color: colors.primaryDark,
    fontWeight: "600",
    flex: 1,
    lineHeight: 16,
  },
  newAddressHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  newAddressFormTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  backToSavedText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: "700",
  },
  formTagRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  formTagBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#E2E8F0",
  },
  formTagBtnSelected: {
    backgroundColor: colors.primary,
  },
  formTagBtnText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: colors.textSoft,
  },
  formTagBtnTextSelected: {
    color: "#FFFFFF",
  },
  inputGroup: {
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSoft,
    marginBottom: 4,
  },
  requiredAsterisk: {
    color: colors.accent,
    fontWeight: "800",
  },
  textInput: {
    height: 40,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    fontSize: 12.5,
    color: colors.text,
  },
  formTwoColRow: {
    flexDirection: "row",
    gap: 10,
  },
  addressAutoSaveHint: {
    fontSize: 11,
    color: colors.textSoft,
    marginTop: 4,
  },
  addressErrorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FBE7E3",
    padding: 8,
    borderRadius: 8,
    marginTop: 10,
  },
  addressErrorText: {
    fontSize: 11.5,
    color: "#BE4436",
    fontWeight: "700",
    flex: 1,
  },

  // Auth Prompt Card
  authPromptCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  authPromptTextGroup: {
    flex: 1,
    marginRight: 10,
  },
  authPromptTitle: {
    fontSize: 12.5,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  authPromptSubtitle: {
    fontSize: 11,
    color: colors.textSoft,
    marginTop: 2,
  },
  authPromptBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  authPromptBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  addressLoadingCard: {
    padding: 16,
    alignItems: "center",
  },
  addressLoadingText: {
    fontSize: 12,
    color: colors.textSoft,
  },

  // 4. Promo Code
  couponCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 16,
  },
  couponHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  couponTitle: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "700",
  },
  couponInputRow: {
    flexDirection: "row",
    gap: 10,
  },
  couponInput: {
    flex: 1,
    height: 40,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  applyBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  applyBtnApplied: {
    backgroundColor: colors.success,
  },
  applyBtnText: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "700",
  },
  couponSuccess: {
    color: colors.success,
    fontSize: 11.5,
    fontWeight: "700",
    marginTop: 8,
  },

  // 5. Payment Section
  paymentSection: {
    marginBottom: 16,
  },
  sectionHeader: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 10,
  },
  paymentOptions: {
    gap: 10,
  },
  paymentOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  paymentOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  paymentSubtitle: {
    color: colors.textSoft,
    fontSize: 11,
    marginTop: 1,
  },

  // 6. Bill Details
  billCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 20,
  },
  billRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 4,
  },
  billLabel: {
    color: colors.textMuted,
    fontSize: 12.5,
  },
  billVal: {
    color: colors.text,
    fontSize: 12.5,
    fontWeight: "700",
  },
  freeDelivery: {
    color: colors.success,
  },
  savingText: {
    color: colors.success,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 8,
  },
  grandTotalLabel: {
    color: colors.primaryDark,
    fontSize: 15,
    fontWeight: "800",
  },
  grandTotalVal: {
    color: colors.accent,
    fontSize: 17,
    fontWeight: "800",
  },

  // 7. Checkout Bar
  checkoutBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  checkoutTotalLabel: {
    color: colors.textSoft,
    fontSize: 11,
    fontWeight: "700",
  },
  checkoutTotal: {
    color: colors.primaryDark,
    fontSize: 18,
    fontWeight: "800",
  },
  placeOrderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 12,
  },
  placeOrderBtnDisabled: {
    opacity: 0.65,
  },
  placeOrderBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
