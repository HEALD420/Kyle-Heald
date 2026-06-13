import * as Clipboard from "expo-clipboard";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { getShopReviews } from "@/api/endpoints";
import { Button, Card, Loading } from "@/components/ui";
import { ReplyTemplate, loadTemplates } from "@/automation/rules";
import { useAuth } from "@/context/AuthContext";
import { colors, spacing } from "@/theme/colors";
import { EtsyReview } from "@/types/etsy";

function stars(n: number): string {
  return "★".repeat(n) + "☆".repeat(Math.max(0, 5 - n));
}

export default function MessagesScreen() {
  const { shop } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reviews, setReviews] = useState<EtsyReview[]>([]);
  const [templates, setTemplates] = useState<ReplyTemplate[]>([]);

  const load = useCallback(async () => {
    if (!shop) return;
    const [rev, tpl] = await Promise.all([
      getShopReviews(shop.shop_id, 50),
      loadTemplates(),
    ]);
    setReviews(rev.results);
    setTemplates(tpl);
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

  const copy = useCallback(async (body: string) => {
    await Clipboard.setStringAsync(body);
    Alert.alert("Copied", "Template copied — paste it into Etsy Messages.");
  }, []);

  if (loading) return <Loading label="Loading reviews…" />;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.noteBox}>
        <Text style={styles.noteText}>
          Etsy's API doesn't allow sending buyer messages, so replies can't be
          fully automated. Tap a template to copy it, then paste into Etsy
          Messages. Reviews below update automatically.
        </Text>
      </View>

      <Text style={styles.section}>Reply templates</Text>
      {templates.map((t) => (
        <Card key={t.id}>
          <Text style={styles.tplTitle}>{t.title}</Text>
          <Text style={styles.tplBody}>{t.body}</Text>
          <View style={{ marginTop: spacing.sm }}>
            <Button title="Copy" variant="secondary" onPress={() => copy(t.body)} />
          </View>
        </Card>
      ))}

      <Text style={styles.section}>Recent reviews</Text>
      {reviews.length === 0 ? (
        <Text style={styles.muted}>No reviews yet.</Text>
      ) : (
        reviews.map((r, i) => (
          <Card key={`${r.listing_id}-${r.created_timestamp}-${i}`}>
            <Text
              style={[
                styles.stars,
                r.rating <= 3 ? { color: colors.danger } : null,
              ]}
            >
              {stars(r.rating)}
            </Text>
            <Text style={styles.reviewText}>{r.review || "(no text)"}</Text>
            <Text style={styles.muted}>
              {new Date(r.created_timestamp * 1000).toLocaleDateString()}
            </Text>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.md },
  noteBox: {
    backgroundColor: "#FFF4EC",
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  noteText: { color: colors.primaryDark, fontSize: 13, lineHeight: 19 },
  section: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginVertical: spacing.sm,
  },
  tplTitle: { fontWeight: "700", color: colors.text },
  tplBody: { color: colors.textMuted, marginTop: 4, lineHeight: 20 },
  stars: { color: colors.warning, fontSize: 16 },
  reviewText: { color: colors.text, marginVertical: 4 },
  muted: { color: colors.textMuted, fontSize: 12 },
});
