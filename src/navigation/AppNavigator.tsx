import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import React from "react";
import { Text } from "react-native";

import { useAuth } from "@/context/AuthContext";
import { colors } from "@/theme/colors";
import AutomationScreen from "@/screens/AutomationScreen";
import DashboardScreen from "@/screens/DashboardScreen";
import ListingsScreen from "@/screens/ListingsScreen";
import LoginScreen from "@/screens/LoginScreen";
import MessagesScreen from "@/screens/MessagesScreen";
import OrdersScreen from "@/screens/OrdersScreen";
import SettingsScreen from "@/screens/SettingsScreen";

const Tab = createBottomTabNavigator();

// Simple emoji tab icons keep the project dependency-free (no icon font setup).
function tabIcon(emoji: string) {
  return ({ focused }: { focused: boolean }) => (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
  );
}

export default function AppNavigator() {
  const { isAuthenticated } = useAuth();

  return (
    <NavigationContainer>
      {isAuthenticated ? (
        <Tab.Navigator
          screenOptions={{
            tabBarActiveTintColor: colors.primary,
            headerStyle: { backgroundColor: colors.background },
            headerTitleStyle: { color: colors.text },
          }}
        >
          <Tab.Screen
            name="Dashboard"
            component={DashboardScreen}
            options={{ tabBarIcon: tabIcon("📊") }}
          />
          <Tab.Screen
            name="Orders"
            component={OrdersScreen}
            options={{ tabBarIcon: tabIcon("📦") }}
          />
          <Tab.Screen
            name="Listings"
            component={ListingsScreen}
            options={{ tabBarIcon: tabIcon("🏷️") }}
          />
          <Tab.Screen
            name="Reviews"
            component={MessagesScreen}
            options={{ tabBarIcon: tabIcon("💬") }}
          />
          <Tab.Screen
            name="Automate"
            component={AutomationScreen}
            options={{ tabBarIcon: tabIcon("⚙️") }}
          />
          <Tab.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ tabBarIcon: tabIcon("👤") }}
          />
        </Tab.Navigator>
      ) : (
        <LoginScreen />
      )}
    </NavigationContainer>
  );
}
