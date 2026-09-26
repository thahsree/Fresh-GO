import { colors, radius } from "@fresh-food/design-tokens";
import {
  Check,
  Heart,
  Minus,
  Plus,
  ShieldCheck,
  Sparkles,
  Star,
  X,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { Product } from "../models/catalog";

type ProductDetailModalProps = {
  product: Product | null;
  visible: boolean;
  isFavorite: boolean;
  products?: Product[];
  onClose: () => void;
  onAddToCart: (productId: string, quantity: number, selectedCut?: string) => void;
  onToggleFavorite: (productId: string) => void;
  onSelectProduct?: (product: Product) => void;
};

export function ProductDetailModal({
  product,
  visible,
  isFavorite,
  products = [],
  onClose,
  onAddToCart,
  onToggleFavorite,
  onSelectProduct,
}: ProductDetailModalProps) {
  if (!product) return null;

  const [quantity, setQuantity] = useState(1);
  const [selectedCut, setSelectedCut] = useState<string>(
    product.cuts?.[0] ?? "Standard Cut",
  );
  const [justAdded, setJustAdded] = useState(false);

  const relatedProducts = products
    .filter(
      (p) =>
        p.id !== product.id &&
        (p.category === product.category || p.isBestSeller),
    )
    .slice(0, 5);

  const isOutOfStock =
    product.isInStock === false ||
    (product.availableStockKg !== undefined && product.availableStockKg <= 0);

  const maxStock =
    product.availableStockKg !== undefined
      ? Math.max(0, Math.floor(product.availableStockKg))
      : 99;

  const isLowStock =
    !isOutOfStock &&
    product.availableStockKg !== undefined &&
    product.availableStockKg > 0 &&
    product.availableStockKg <= 5;

  const displayTag =
    product.tag ||
    (product.isDailyCatch
      ? "Fresh Catch"
      : product.isFlashFrozen
      ? "Frozen"
      : product.fresh
      ? "Fresh"
      : undefined);

  const handleAdd = () => {
    if (isOutOfStock || quantity > maxStock) return;
    onAddToCart(product.id, quantity, selectedCut);
    setJustAdded(true);
    setTimeout(() => {
      setJustAdded(false);
      onClose();
    }, 600);
  };

  const totalPrice = product.price * quantity;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          {/* Header Drag Handle */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Product Hero Image */}
            <View style={styles.imageWrapper}>
              <Image
                source={{ uri: product.image }}
                style={styles.image}
                resizeMode="cover"
              />
              <Pressable
                style={styles.closeBtn}
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <X size={18} color={colors.primaryDark} />
              </Pressable>
              <Pressable
                style={styles.favBtn}
                onPress={() => onToggleFavorite(product.id)}
                accessibilityRole="button"
                accessibilityLabel="Favorite"
              >
                <Heart
                  size={18}
                  color={isFavorite ? colors.accent : colors.primaryDark}
                  fill={isFavorite ? colors.accent : "transparent"}
                />
              </Pressable>

              {isOutOfStock ? (
                <View style={[styles.freshTag, { backgroundColor: "#BE4436", borderColor: "#991B1B" }]}>
                  <Text style={[styles.freshTagText, { color: "#FFFFFF", fontWeight: "900" }]}>
                    OUT OF STOCK
                  </Text>
                </View>
              ) : displayTag ? (
                <View
                  style={[
                    styles.freshTag,
                    displayTag === "Frozen"
                      ? styles.frozenTag
                      : displayTag === "Fresh Cut"
                      ? { backgroundColor: "#FEF9C3", borderColor: "#FEF08A" }
                      : displayTag === "Fresh Produce"
                      ? { backgroundColor: "#DCFCE7", borderColor: "#BBF7D0" }
                      : {},
                  ]}
                >
                  {displayTag === "Fresh Catch" && <View style={styles.freshDot} />}
                  {displayTag === "Fresh" && <View style={[styles.freshDot, { backgroundColor: "#15803D" }]} />}
                  {displayTag === "Frozen" && <Text style={styles.frozenTagEmoji}>❄️</Text>}
                  {displayTag === "Fresh Cut" && <Text style={{ fontSize: 10, marginRight: 2 }}>🥩</Text>}
                  {displayTag === "Fresh Produce" && <Text style={{ fontSize: 10, marginRight: 2 }}>🥬</Text>}
                  <Text
                    style={[
                      styles.freshTagText,
                      displayTag === "Frozen"
                        ? styles.frozenTagText
                        : displayTag === "Fresh Cut"
                        ? { color: "#854D0E" }
                        : displayTag === "Fresh Produce"
                        ? { color: "#166534" }
                        : {},
                    ]}
                  >
                    {displayTag}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Product Meta */}
            <View style={styles.metaRow}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{product.category}</Text>
              </View>
              {product.rating && (
                <View style={styles.ratingBadge}>
                  <Star size={12} color="#F5A623" fill="#F5A623" />
                  <Text style={styles.ratingText}>
                    {product.rating} ({product.reviewsCount ?? 45})
                  </Text>
                </View>
              )}
            </View>

            {/* Title & Price */}
            <Text style={styles.title}>{product.name}</Text>
            <View style={styles.priceRow}>
              <Text style={styles.price}>
                Rs {product.price.toLocaleString()}
                <Text style={styles.unit}> {product.unit}</Text>
              </Text>
              {product.netWeight && (
                <Text style={styles.weightTag}>{product.netWeight}</Text>
              )}
            </View>

            {/* Out of Stock Warning */}
            {isOutOfStock && (
              <View
                style={{
                  marginHorizontal: 20,
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 10,
                  backgroundColor: "#FBE7E3",
                  borderWidth: 1,
                  borderColor: "#BE4436",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Text style={{ fontSize: 16 }}>❌</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: "800", color: "#9C2B1F" }}>
                    Currently Out of Stock
                  </Text>
                  <Text style={{ fontSize: 11, color: "#BE4436" }}>
                    Fresh stock will be replenished in the next hub dispatch.
                  </Text>
                </View>
              </View>
            )}

            {/* Low Stock Warning */}
            {isLowStock && (
              <View
                style={{
                  marginHorizontal: 20,
                  marginTop: 12,
                  padding: 10,
                  borderRadius: 10,
                  backgroundColor: "#FEF3C7",
                  borderWidth: 1,
                  borderColor: "#F59E0B",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Text style={{ fontSize: 14 }}>⚠️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: "800", color: "#B45309" }}>
                    Low Stock: Only {product.availableStockKg} {product.unit} left!
                  </Text>
                  <Text style={{ fontSize: 10.5, color: "#D97706" }}>
                    Order now before this fresh batch sells out.
                  </Text>
                </View>
              </View>
            )}

            {/* Cuts Selection */}
            {product.cuts && product.cuts.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Choose Cut / Preparation</Text>
                <View style={styles.cutOptions}>
                  {product.cuts.map((cut) => {
                    const isSelected = selectedCut === cut;
                    return (
                      <Pressable
                        key={cut}
                        style={[
                          styles.cutChip,
                          isSelected && styles.cutChipSelected,
                        ]}
                        onPress={() => setSelectedCut(cut)}
                      >
                        <Text
                          style={[
                            styles.cutChipText,
                            isSelected && styles.cutChipTextSelected,
                          ]}
                        >
                          {cut}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Description */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Product Details</Text>
              <Text style={styles.description}>{product.description}</Text>
            </View>

            {/* Origin & Freshness Guarantee */}
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <ShieldCheck size={18} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoTitle}>FreshGo Assurance</Text>
                  <Text style={styles.infoSub}>
                    Source: {product.origin ?? "Direct Partner Farms"} · 100%
                    Chemical & Formalin Free
                  </Text>
                </View>
              </View>
              {product.storageTip && (
                <Text style={styles.storageTip}>💡 {product.storageTip}</Text>
              )}
            </View>

            {/* You May Also Like Section */}
            {relatedProducts.length > 0 && (
              <View style={styles.relatedSection}>
                <View style={styles.relatedHeader}>
                  <Sparkles size={16} color={colors.accent} />
                  <Text style={styles.relatedTitle}>You May Also Like</Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.relatedRail}
                >
                  {relatedProducts.map((item) => (
                    <Pressable
                      key={item.id}
                      style={styles.relatedCard}
                      onPress={() => onSelectProduct?.(item)}
                      accessibilityRole="button"
                    >
                      <Image
                        source={{ uri: item.image }}
                        style={styles.relatedImage}
                        resizeMode="cover"
                      />
                      <View style={styles.relatedBody}>
                        <Text style={styles.relatedName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <View style={styles.relatedPriceRow}>
                          <Text style={styles.relatedPrice}>
                            Rs {item.price}
                          </Text>
                          <Pressable
                            style={styles.relatedAddBtn}
                            onPress={(e) => {
                              e.stopPropagation();
                              onAddToCart(item.id, 1);
                            }}
                            accessibilityLabel="Quick add"
                          >
                            <Plus size={12} color="#FFFFFF" strokeWidth={3} />
                          </Pressable>
                        </View>
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}
          </ScrollView>

          {/* Bottom Action Bar */}
          <View style={styles.bottomBar}>
            <View style={[styles.stepper, (isOutOfStock || maxStock <= 0) && { opacity: 0.5 }]}>
              <Pressable
                style={styles.stepperBtn}
                onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                accessibilityLabel="Decrease quantity"
                disabled={isOutOfStock || maxStock <= 0 || quantity <= 1}
              >
                <Minus size={16} color={quantity <= 1 || isOutOfStock ? "#94A3B8" : colors.primaryDark} />
              </Pressable>
              <Text style={styles.quantityText}>{isOutOfStock || maxStock <= 0 ? 0 : quantity}</Text>
              <Pressable
                style={styles.stepperBtn}
                onPress={() => setQuantity((q) => Math.min(maxStock, q + 1))}
                accessibilityLabel="Increase quantity"
                disabled={isOutOfStock || maxStock <= 0 || quantity >= maxStock}
              >
                <Plus size={16} color={quantity >= maxStock || isOutOfStock ? "#94A3B8" : colors.primaryDark} />
              </Pressable>
            </View>

            <Pressable
              style={[
                styles.addBtn,
                justAdded && styles.addBtnSuccess,
                (isOutOfStock || maxStock <= 0) && { backgroundColor: "#94A3B8" },
              ]}
              onPress={handleAdd}
              disabled={isOutOfStock || maxStock <= 0}
              accessibilityRole="button"
            >
              {justAdded ? (
                <>
                  <Check size={18} color="#FFFFFF" strokeWidth={3} />
                  <Text style={styles.addBtnText}>Added to Cart</Text>
                </>
              ) : isOutOfStock || maxStock <= 0 ? (
                <Text style={styles.addBtnText}>Out of Stock</Text>
              ) : (
                <Text style={styles.addBtnText}>
                  Add to Cart · Rs {totalPrice.toLocaleString()}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    paddingBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  handleContainer: {
    alignItems: "center",
    paddingVertical: 10,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  imageWrapper: {
    position: "relative",
    width: "100%",
    height: 220,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: colors.primaryTint,
    marginBottom: 16,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  closeBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  favBtn: {
    position: "absolute",
    top: 12,
    left: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  freshTag: {
    position: "absolute",
    bottom: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  freshDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  freshTagText: {
    color: colors.success,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  frozenTag: {
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
  },
  frozenTagEmoji: {
    fontSize: 12,
  },
  frozenTagText: {
    color: "#0369A1",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  categoryBadge: {
    backgroundColor: colors.primaryTint,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  categoryBadgeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "700",
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  ratingText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "700",
  },
  title: {
    color: colors.primaryDark,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  price: {
    color: colors.accent,
    fontSize: 22,
    fontWeight: "800",
  },
  unit: {
    color: colors.textSoft,
    fontSize: 13,
    fontWeight: "600",
  },
  weightTag: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  section: {
    marginTop: 12,
    marginBottom: 8,
  },
  sectionTitle: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 8,
  },
  cutOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  cutChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cutChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint,
  },
  cutChipText: {
    color: colors.textSoft,
    fontSize: 12,
    fontWeight: "700",
  },
  cutChipTextSelected: {
    color: colors.primary,
  },
  description: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  infoCard: {
    backgroundColor: colors.surfaceAlt,
    padding: 14,
    borderRadius: 14,
    marginTop: 12,
    gap: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  infoTitle: {
    color: colors.primaryDark,
    fontSize: 12.5,
    fontWeight: "700",
  },
  infoSub: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  storageTip: {
    color: colors.text,
    fontSize: 11.5,
    fontWeight: "500",
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 6,
    backgroundColor: colors.surfaceAlt,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  quantityText: {
    color: colors.primaryDark,
    fontSize: 15,
    fontWeight: "800",
    minWidth: 24,
    textAlign: "center",
  },
  addBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.accent,
    paddingVertical: 14,
    borderRadius: 14,
  },
  addBtnSuccess: {
    backgroundColor: colors.success,
  },
  addBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  relatedSection: {
    marginTop: 18,
    marginBottom: 8,
  },
  relatedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  relatedTitle: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "800",
  },
  relatedRail: {
    gap: 10,
    paddingRight: 10,
  },
  relatedCard: {
    width: 140,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  relatedImage: {
    width: "100%",
    height: 80,
    backgroundColor: colors.primaryTint,
  },
  relatedBody: {
    padding: 8,
  },
  relatedName: {
    color: colors.text,
    fontSize: 11.5,
    fontWeight: "700",
    marginBottom: 4,
  },
  relatedPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  relatedPrice: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "800",
  },
  relatedAddBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
