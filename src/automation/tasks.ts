import * as BackgroundFetch from "expo-background-fetch";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";

import { runAutomation } from "./engine";
import { loadRules } from "./rules";
import { StoreKeys, getItem } from "@/storage/secureStore";

export const BACKGROUND_TASK = "etsy-automation-check";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

async function notify(title: string, body: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: null, // deliver immediately
  });
}

// The function the OS invokes in the background. It runs the automation engine
// and pushes a local notification per new event.
TaskManager.defineTask(BACKGROUND_TASK, async () => {
  try {
    const shopId = await getItem<number>(StoreKeys.shopId);
    if (!shopId) return BackgroundFetch.BackgroundFetchResult.NoData;

    const events = await runAutomation(shopId);
    if (events.length === 0) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Avoid notification spam: summarize when there are many events.
    if (events.length <= 3) {
      for (const e of events) await notify(e.title, e.detail);
    } else {
      await notify(
        "Etsy Automator",
        `${events.length} new updates: orders, stock and reviews need a look.`
      );
    }
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundTask(): Promise<void> {
  const rules = await loadRules();
  const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK);
  if (isRegistered) {
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_TASK).catch(() => {});
  }
  await BackgroundFetch.registerTaskAsync(BACKGROUND_TASK, {
    minimumInterval: Math.max(15, rules.checkIntervalMinutes) * 60,
    stopOnTerminate: false,
    startOnBoot: true,
  });
}

export async function unregisterBackgroundTask(): Promise<void> {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK);
  if (isRegistered) await BackgroundFetch.unregisterTaskAsync(BACKGROUND_TASK);
}
