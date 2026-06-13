import React, { useCallback, useEffect, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { getReceipts } from "@/api/endpoints";
import { runAutomation, AutomationEvent } from "@/automation/engine";
import { Button, Card, EmptyState, Loading, StatTile } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { colors, spacing } from "@/theme/colors";
import { EtsyReceipt, moneyToNumber } from "@/types/etsy";

interface Analytics {
  revenue30d: number;
  orders30d: number;
  unshipped: number;
  topSellers: { title: string; count: number }[];
  currency: string;
}

const THIRTY_DAYS = 30 * 24 * 60 * 60;

function computeAnalytics(receipts: EtsyReceipt[]): Analytics {
  const cutoff = Date.now() / 1000 - THIRTY_DAYS;
  let revenue = 0;
  let orders = 0;
  let unshipped = 0;
  let currency = "USD";
  const tally = new Map<string, number>();

  for (const r of receipts) {
    currency = r.grandtotal?.currency_code ?? currency;
    if (!r.is_shipped) unshipped++;
    if (r.created_timestamp >= cutoff) {
      revenue += moneyToNumber(r.grandtotal);
      orders++;
      for (const t of r.transactions) {
        tally.set(t.title, (tally.get(t.title) ?? 0) + t.quantity);
      }
    }
  }

  const topSellers = [...tally.entries()]
    .map(([title, count]) => ({ title, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return { revenue30d: revenue, orders30d: orders, unshipped, topSellers, currency };
}

export default function DashboardScreen() {
  const { shop } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [events, setEvents] = useState<AutomationEvent[]>([]);

  const load = useCallback(async () => {
    if (!shop) return;
    const receipts = await getReceipts(shop.shop_id, { limit: 100 });
    setAnalytics(computeAnalytics(receipts.results));
    const found = await runAutomation(shop.shop_id);
    setEvents(found);
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

  if (loading) return <Loading label="Crunching your shop numbers…" />;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.shopName}>{shop?.shop_name}</Text>

      <Card>
        <Text style={styles.cardTitle}>Last 30 days</Text>
        <View style={styles.row}>
          <StatTile
            label="Revenue"
            value={`${analytics?.currency ?? ""} ${(analytics?.revenue30d ?? 0).toFixed(0)}`}
            accent={colors.success}
          />
          <StatTile label="Orders" value={`${analytics?.orders30d ?? 0}`} />
          <StatTile
            label="To ship"
            value={`${analytics?.unshipped ?? 0}`}
            accent={colors.warning}
          />
        </View>
        <View style={styles.row}>
          <StatTile label="Active listings" value={`${shop?.listing_active_count ?? 0}`} />
          <StatTile label="Admirers" value={`${shop?.num_favorers ?? 0}`} />
        </View>
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Best sellers (30d)</Text>
        {analytics?.topSellers.length ? (
          analytics.topSellers.map((s, i) => (
            <View key={s.title} style={styles.sellerRow}>
              <Text style={styles.sellerRank}>{i + 1}</Text>
              <Text style={styles.sellerTitle} numberOfLines={1}>
                {s.title}
              </Text>
              <Text style={styles.sellerCount}>{s.count} sold</Text>
            </View>
          ))
        ) : (
          <Text style={styles.muted}>No sales in the last 30 days yet.</Text>
        )}
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Needs attention</Text>
        {events.length === 0 ? (
          <Text style={styles.muted}>All caught up — nothing needs you. ✅</Text>
        ) : (
          events.slice(0, 8).map((e) => (
            <View key={e.id} style={styles.eventRow}>
              <Text style={styles.eventTitle}>{e.title}</Text>
              <Text style={styles.muted} numberOfLines={2}>
                {e.detail}
              </Text>
            </View>
          ))
        )}
        <View style={{ marginTop: spacing.sm }}>
          <Button title="Re-check now" variant="secondary" onPress={onRefresh} />
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.md },
  shopName: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.text,
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  row: { flexDirection: "row", justifyContent: "space-between" },
  sellerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  sellerRank: {
    width: 22,
    fontWeight: "700",
    color: colors.primary,
  },
  sellerTitle: { flex: 1, color: colors.text },
  sellerCount: { color: colors.textMuted, fontSize: 12 },
  eventRow: {
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  eventTitle: { fontWeight: "600", color: colors.text },
  muted: { color: colors.textMuted },
});
