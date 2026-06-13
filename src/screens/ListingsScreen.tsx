import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { getActiveListings, updateListing } from "@/api/endpoints";
import { Button, Card, EmptyState, Loading } from "@/components/ui";
import { loadRules } from "@/automation/rules";
import { useAuth } from "@/context/AuthContext";
import { colors, radius, spacing } from "@/theme/colors";
import { EtsyListing, formatMoney, moneyToNumber } from "@/types/etsy";

export default function ListingsScreen() {
  const { shop } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [listings, setListings] = useState<EtsyListing[]>([]);
  const [threshold, setThreshold] = useState(3);
  const [active, setActive] = useState<EtsyListing | null>(null);
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!shop) return;
    const [res, rules] = await Promise.all([
      getActiveListings(shop.shop_id, 100),
      loadRules(),
    ]);
    setThreshold(rules.lowStockThreshold);
    // Surface low-stock items first.
    res.results.sort((a, b) => a.quantity - b.quantity);
    setListings(res.results);
  }, [shop]);

  useEffect(() => {
    (async () => {
      try {
        await load();
      } finally {
        setLoading(false);
      }
    })();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const openEdit = useCallback((l: EtsyListing) => {
    setActive(l);
    setPrice(String(moneyToNumber(l.price).toFixed(2)));
    setQuantity(String(l.quantity));
  }, []);

  const save = useCallback(async () => {
    if (!shop || !active) return;
    const changes: { price?: number; quantity?: number } = {};
    const p = parseFloat(price);
    const q = parseInt(quantity, 10);
    if (!Number.isNaN(p)) changes.price = p;
    if (!Number.isNaN(q)) changes.quantity = q;
    setSaving(true);
    try {
      await updateListing(shop.shop_id, active.listing_id, changes);
      setActive(null);
      await load();
    } catch (e) {
      Alert.alert("Failed", e instanceof Error ? e.message : "Update failed.");
    } finally {
      setSaving(false);
    }
  }, [shop, active, price, quantity, load]);

  if (loading) return <Loading label="Loading listings…" />;

  return (
    <View style={styles.screen}>
      <FlatList
        data={listings}
        keyExtractor={(l) => String(l.listing_id)}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <EmptyState title="No active listings" subtitle="Active listings will show here." />
        }
        renderItem={({ item }) => {
          const low = item.quantity <= threshold;
          return (
            <Card>
              <Text style={styles.title} numberOfLines={2}>
                {item.title}
              </Text>
              <View style={styles.metaRow}>
                <Text style={styles.price}>{formatMoney(item.price)}</Text>
                <Text style={[styles.qty, low ? styles.qtyLow : null]}>
                  {low ? "⚠️ " : ""}
                  {item.quantity} in stock
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.muted}>{item.views} views</Text>
                <Text style={styles.muted}>{item.num_favorers} favorites</Text>
              </View>
              <View style={{ marginTop: spacing.sm }}>
                <Button
                  title="Edit price / stock"
                  variant="secondary"
                  onPress={() => openEdit(item)}
                />
              </View>
            </Card>
          );
        }}
      />

      <Modal visible={!!active} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit listing</Text>
            <Text style={styles.modalSub} numberOfLines={2}>
              {active?.title}
            </Text>
            <Text style={styles.fieldLabel}>Price</Text>
            <TextInput
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
              style={styles.input}
              placeholderTextColor={colors.textMuted}
            />
            <Text style={styles.fieldLabel}>Quantity</Text>
            <TextInput
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="number-pad"
              style={styles.input}
              placeholderTextColor={colors.textMuted}
            />
            <View style={styles.modalActions}>
              <View style={styles.flex}>
                <Button title="Cancel" variant="secondary" onPress={() => setActive(null)} />
              </View>
              <View style={styles.flex}>
                <Button
                  title={saving ? "Saving…" : "Save"}
                  onPress={save}
                  disabled={saving}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.md, flexGrow: 1 },
  title: { fontWeight: "700", fontSize: 15, color: colors.text },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.xs,
  },
  price: { fontWeight: "700", color: colors.text },
  qty: { color: colors.textMuted },
  qtyLow: { color: colors.danger, fontWeight: "700" },
  muted: { color: colors.textMuted, fontSize: 12 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
  modalSub: { color: colors.textMuted, marginBottom: spacing.md },
  fieldLabel: { fontSize: 12, color: colors.textMuted, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.sm + 2,
    marginBottom: spacing.sm,
    color: colors.text,
  },
  modalActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  flex: { flex: 1 },
});
