import React from "react";
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";

import { Button, Card } from "@/components/ui";
import { unregisterBackgroundTask } from "@/automation/tasks";
import { useAuth } from "@/context/AuthContext";
import { colors, spacing } from "@/theme/colors";

export default function SettingsScreen() {
  const { shop, logout } = useAuth();

  const handleLogout = async () => {
    await unregisterBackgroundTask();
    await logout();
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.label}>Connected shop</Text>
        <Text style={styles.value}>{shop?.shop_name}</Text>
        <Text style={styles.muted}>Shop ID: {shop?.shop_id}</Text>
        <Text style={styles.muted}>Currency: {shop?.currency_code}</Text>
        {shop?.url ? (
          <View style={{ marginTop: spacing.sm }}>
            <Button
              title="Open shop on Etsy"
              variant="secondary"
              onPress={() => Linking.openURL(shop.url)}
            />
          </View>
        ) : null}
      </Card>

      <Card>
        <Text style={styles.label}>About</Text>
        <Text style={styles.muted}>
          Etsy Automator uses the official Etsy Open API v3. It never stores your
          Etsy password — sign-in happens securely through Etsy and tokens are
          kept in your device keychain.
        </Text>
      </Card>

      <Button title="Disconnect & log out" variant="danger" onPress={handleLogout} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.md },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  value: { fontSize: 18, fontWeight: "700", color: colors.text },
  muted: { color: colors.textMuted, marginTop: 2, lineHeight: 20 },
});
