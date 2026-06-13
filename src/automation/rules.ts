import { StoreKeys, getItem, setItem } from "@/storage/secureStore";

export interface AutomationRules {
  // Orders & shipping
  newOrderAlert: boolean;
  // Listings & inventory
  lowStockAlert: boolean;
  lowStockThreshold: number;
  expiringListingAlert: boolean;
  expiringWithinDays: number;
  // Messages & reviews
  newReviewAlert: boolean;
  lowRatingAlert: boolean; // extra alert for <= 3 star reviews
  // How often the background check runs (minutes). iOS treats this as a hint.
  checkIntervalMinutes: number;
}

export const DEFAULT_RULES: AutomationRules = {
  newOrderAlert: true,
  lowStockAlert: true,
  lowStockThreshold: 3,
  expiringListingAlert: true,
  expiringWithinDays: 7,
  newReviewAlert: true,
  lowRatingAlert: true,
  checkIntervalMinutes: 60,
};

export async function loadRules(): Promise<AutomationRules> {
  const saved = await getItem<Partial<AutomationRules>>(
    StoreKeys.automationRules
  );
  return { ...DEFAULT_RULES, ...(saved ?? {}) };
}

export async function saveRules(rules: AutomationRules): Promise<void> {
  await setItem(StoreKeys.automationRules, rules);
}

export interface ReplyTemplate {
  id: string;
  title: string;
  body: string;
}

// Etsy's API has no messaging endpoint, so these templates can't be sent
// automatically. The app keeps them ready to copy into Etsy's web/app messenger.
export const DEFAULT_TEMPLATES: ReplyTemplate[] = [
  {
    id: "order-thanks",
    title: "Order thank-you",
    body: "Hi {name}, thank you so much for your order! I'm preparing it with care and will share tracking as soon as it ships. 🧡",
  },
  {
    id: "shipped",
    title: "Shipped notice",
    body: "Good news {name} — your order is on its way! Tracking: {tracking}. Thanks again for supporting my shop.",
  },
  {
    id: "review-thanks",
    title: "Review thank-you",
    body: "Thank you for the wonderful review, {name}! It truly means a lot. Hope to see you again soon. 🧡",
  },
  {
    id: "delay",
    title: "Slight delay",
    body: "Hi {name}, just a heads-up that your order may take an extra day or two. Thanks so much for your patience!",
  },
];

export async function loadTemplates(): Promise<ReplyTemplate[]> {
  const saved = await getItem<ReplyTemplate[]>(StoreKeys.replyTemplates);
  return saved && saved.length ? saved : DEFAULT_TEMPLATES;
}

export async function saveTemplates(templates: ReplyTemplate[]): Promise<void> {
  await setItem(StoreKeys.replyTemplates, templates);
}
