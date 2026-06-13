import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button, Loading } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { colors, spacing } from "@/theme/colors";

export default function LoginScreen() {
  const { login, loading, error } = useAuth();

  if (loading) return <Loading label="Connecting to Etsy…" />;

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>🧡</Text>
      <Text style={styles.title}>Etsy Automator</Text>
      <Text style={styles.subtitle}>
        Track orders, manage inventory, and stay on top of reviews — with smart
        alerts that run in the background.
      </Text>
      <Button title="Connect your Etsy shop" onPress={login} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Text style={styles.note}>
        Secure sign-in via Etsy (OAuth). Your password is never seen by this app.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  logo: { fontSize: 56, marginBottom: spacing.md },
  title: { fontSize: 28, fontWeight: "800", color: colors.text },
  subtitle: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: "center",
    marginVertical: spacing.lg,
    lineHeight: 22,
  },
  error: { color: colors.danger, marginTop: spacing.md, textAlign: "center" },
  note: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xl,
  },
});
