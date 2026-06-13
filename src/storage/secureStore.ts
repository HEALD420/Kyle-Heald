import * as SecureStore from "expo-secure-store";

// Thin wrapper around expo-secure-store with JSON helpers. Tokens and shop
// identity are stored here (Keychain on iOS) so they survive app restarts.

export const StoreKeys = {
  tokens: "etsy_tokens",
  shopId: "etsy_shop_id",
  userId: "etsy_user_id",
  automationRules: "automation_rules",
  replyTemplates: "reply_templates",
  seenReviewIds: "seen_review_ids",
} as const;

export async function setItem(key: string, value: unknown): Promise<void> {
  await SecureStore.setItemAsync(key, JSON.stringify(value));
}

export async function getItem<T>(key: string): Promise<T | null> {
  const raw = await SecureStore.getItemAsync(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function removeItem(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key);
}
