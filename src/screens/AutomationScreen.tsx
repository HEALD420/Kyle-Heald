import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { Button, Card, Loading } from "@/components/ui";
import { AutomationRules, loadRules, saveRules } from "@/automation/rules";
import {
  registerBackgroundTask,
  requestNotificationPermission,
  unregisterBackgroundTask,
} from "@/automation/tasks";
import { colors, spacing } from "@/theme/colors";

function Toggle({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.flex}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.primary }}
      />
    </View>
  );
}

export default function AutomationScreen() {
  const [rules, setRules] = useState<AutomationRules | null>(null);

  useEffect(() => {
    loadRules().then(setRules);
  }, []);

  const update = useCallback(
    (patch: Partial<AutomationRules>) =>
      setRules((prev) => (prev ? { ...prev, ...patch } : prev)),
    []
  );

  const persist = useCallback(async () => {
    if (!rules) return;
    await saveRules(rules);
    const anyEnabled =
      rules.newOrderAlert ||
      rules.lowStockAlert ||
      rules.expiringListingAlert ||
      rules.newReviewAlert;
    if (anyEnabled) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert(
          "Notifications off",
          "Enable notifications in iOS Settings to receive automation alerts."
        );
      }
      await registerBackgroundTask();
    } else {
      await unregisterBackgroundTask();
    }
    Alert.alert("Saved", "Automation settings updated.");
  }, [rules]);

  if (!rules) return <Loading label="Loading automation…" />;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.intro}>
        Choose what the app watches for. Checks run periodically in the
        background and send you a notification when something needs attention.
      </Text>

      <Card>
        <Text style={styles.section}>Orders & shipping</Text>
        <Toggle
          label="New order alerts"
          hint="Notify when a paid order is waiting to ship."
          value={rules.newOrderAlert}
          onChange={(v) => update({ newOrderAlert: v })}
        />
      </Card>

      <Card>
        <Text style={styles.section}>Listings & inventory</Text>
        <Toggle
          label="Low-stock alerts"
          value={rules.lowStockAlert}
          onChange={(v) => update({ lowStockAlert: v })}
        />
        <View style={styles.inlineField}>
          <Text style={styles.hint}>Alert at or below</Text>
          <TextInput
            value={String(rules.lowStockThreshold)}
            onChangeText={(t) =>
              update({ lowStockThreshold: parseInt(t, 10) || 0 })
            }
            keyboardType="number-pad"
            style={styles.smallInput}
          />
          <Text style={styles.hint}>units</Text>
        </View>
        <Toggle
          label="Expiring-listing alerts"
          value={rules.expiringListingAlert}
          onChange={(v) => update({ expiringListingAlert: v })}
        />
        <View style={styles.inlineField}>
          <Text style={styles.hint}>Warn within</Text>
          <TextInput
            value={String(rules.expiringWithinDays)}
            onChangeText={(t) =>
              update({ expiringWithinDays: parseInt(t, 10) || 0 })
            }
            keyboardType="number-pad"
            style={styles.smallInput}
          />
          <Text style={styles.hint}>days</Text>
        </View>
      </Card>

      <Card>
        <Text style={styles.section}>Messages & reviews</Text>
        <Toggle
          label="New review alerts"
          value={rules.newReviewAlert}
          onChange={(v) => update({ newReviewAlert: v })}
        />
        <Toggle
          label="Low-rating alerts"
          hint="Extra alert for 1–3 star reviews."
          value={rules.lowRatingAlert}
          onChange={(v) => update({ lowRatingAlert: v })}
        />
      </Card>

      <Card>
        <Text style={styles.section}>Schedule</Text>
        <View style={styles.inlineField}>
          <Text style={styles.hint}>Check every</Text>
          <TextInput
            value={String(rules.checkIntervalMinutes)}
            onChangeText={(t) =>
              update({ checkIntervalMinutes: parseInt(t, 10) || 15 })
            }
            keyboardType="number-pad"
            style={styles.smallInput}
          />
          <Text style={styles.hint}>min (iOS minimum ~15)</Text>
        </View>
      </Card>

      <Button title="Save automation settings" onPress={persist} />
      <Text style={styles.disclaimer}>
        iOS decides exactly when background checks run to save battery, so timing
        is approximate. Open the app anytime to force an immediate check.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.md },
  intro: { color: colors.textMuted, marginBottom: spacing.md, lineHeight: 20 },
  section: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  toggleLabel: { fontSize: 15, color: colors.text, fontWeight: "500" },
  hint: { fontSize: 12, color: colors.textMuted },
  flex: { flex: 1 },
  inlineField: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  smallInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    minWidth: 56,
    textAlign: "center",
    color: colors.text,
  },
  disclaimer: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.md,
    lineHeight: 18,
  },
});
