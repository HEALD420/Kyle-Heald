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

import { getReceipts, markShipped } from "@/api/endpoints";
import { Button, Card, EmptyState, Loading } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { colors, radius, spacing } from "@/theme/colors";
import { EtsyReceipt, formatMoney } from "@/types/etsy";

export default function OrdersScreen() {
  const { shop } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState<EtsyReceipt[]>([]);
  const [active, setActive] = useState<EtsyReceipt | null>(null);
  const [tracking, setTracking] = useState("");
  const [carrier, setCarrier] = useState("usps");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!shop) return;
    const res = await getReceipts(shop.shop_id, {
      was_paid: true,
      was_shipped: false,
      limit: 50,
    });
    setOrders(res.results);
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

  const submitShipment = useCallback(async () => {
    if (!shop || !active) return;
    if (!tracking.trim()) {
      Alert.alert("Tracking required", "Enter a tracking number first.");
      return;
    }
    setSubmitting(true);
    try {
      await markShipped(shop.shop_id, active.receipt_id, {
        tracking_code: tracking.trim(),
        carrier_name: carrier.trim() || "usps",
        send_bcc: false,
      });
      setActive(null);
      setTracking("");
      await load();
      Alert.alert("Shipped", "Tracking added and buyer notified by Etsy.");
    } catch (e) {
      Alert.alert("Failed", e instanceof Error ? e.message : "Could not ship.");
    } finally {
      setSubmitting(false);
    }
  }, [shop, active, tracking, carrier, load]);

  if (loading) return <Loading label="Loading orders…" />;

  return (
    <View style={styles.screen}>
      <FlatList
        data={orders}
        keyExtractor={(r) => String(r.receipt_id)}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <EmptyState
            title="No orders to ship 🎉"
            subtitle="Paid orders awaiting shipment will appear here."
          />
        }
        renderItem={({ item }) => (
          <Card>
            <View style={styles.headerRow}>
              <Text style={styles.buyer}>{item.name}</Text>
              <Text style={styles.total}>{formatMoney(item.grandtotal)}</Text>
            </View>
            {item.transactions.map((t) => (
              <Text key={t.transaction_id} style={styles.item}>
                {t.quantity}× {t.title}
              </Text>
            ))}
            <Text style={styles.address}>{item.formatted_address}</Text>
            <View style={{ marginTop: spacing.sm }}>
              <Button title="Mark shipped" onPress={() => setActive(item)} />
            </View>
          </Card>
        )}
      />

      <Modal visible={!!active} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add tracking</Text>
            <Text style={styles.modalSub}>{active?.name}</Text>
            <TextInput
              placeholder="Tracking number"
              value={tracking}
              onChangeText={setTracking}
              autoCapitalize="characters"
              style={styles.input}
              placeholderTextColor={colors.textMuted}
            />
            <TextInput
              placeholder="Carrier (e.g. usps, fedex, ups, dhl)"
              value={carrier}
              onChangeText={setCarrier}
              autoCapitalize="none"
              style={styles.input}
              placeholderTextColor={colors.textMuted}
            />
            <View style={styles.modalActions}>
              <View style={styles.flex}>
                <Button
                  title="Cancel"
                  variant="secondary"
                  onPress={() => setActive(null)}
                />
              </View>
              <View style={styles.flex}>
                <Button
                  title={submitting ? "Sending…" : "Confirm"}
                  onPress={submitShipment}
                  disabled={submitting}
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
  headerRow: { flexDirection: "row", justifyContent: "space-between" },
  buyer: { fontWeight: "700", fontSize: 16, color: colors.text },
  total: { fontWeight: "700", color: colors.success },
  item: { color: colors.text, marginTop: 2 },
  address: { color: colors.textMuted, fontSize: 12, marginTop: spacing.sm },
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
