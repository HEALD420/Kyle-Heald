import { StatusBar } from "expo-status-bar";
import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

// Registering the background task on import wires up the TaskManager handler.
import "@/automation/tasks";
import AppNavigator from "@/navigation/AppNavigator";
import { AuthProvider } from "@/context/AuthContext";

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
