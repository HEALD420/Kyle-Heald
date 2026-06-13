import {
  getActiveListings,
  getReceipts,
  getShopReviews,
} from "@/api/endpoints";
import { StoreKeys, getItem, setItem } from "@/storage/secureStore";
import { AutomationRules, loadRules } from "./rules";

export interface AutomationEvent {
  id: string;
  type: "order" | "lowStock" | "expiring" | "review" | "lowRating";
  title: string;
  detail: string;
  timestamp: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// Runs all enabled automation rules against the shop and returns the list of
// newly-detected events. "New" is tracked via stored seen-ids so the same order
// or review never alerts twice.
export async function runAutomation(shopId: number): Promise<AutomationEvent[]> {
  const rules: AutomationRules = await loadRules();
  const events: AutomationEvent[] = [];
  const seen = (await getItem<string[]>(StoreKeys.seenReviewIds)) ?? [];
  const seenSet = new Set(seen);

  // 1. New paid-but-unshipped orders.
  if (rules.newOrderAlert) {
    try {
      const receipts = await getReceipts(shopId, {
        was_paid: true,
        was_shipped: false,
        limit: 50,
      });
      for (const r of receipts.results) {
        const key = `order:${r.receipt_id}`;
        if (!seenSet.has(key)) {
          seenSet.add(key);
          events.push({
            id: key,
            type: "order",
            title: "New order to ship",
            detail: `${r.name} — ${r.transactions
              .map((t) => `${t.quantity}× ${t.title}`)
              .join(", ")}`,
            timestamp: r.created_timestamp * 1000,
          });
        }
      }
    } catch {
      // Non-fatal: skip this check this cycle.
    }
  }

  // 2. Low stock & expiring listings (single fetch of active listings).
  if (rules.lowStockAlert || rules.expiringListingAlert) {
    try {
      const listings = await getActiveListings(shopId, 100);
      const now = Date.now();
      for (const l of listings.results) {
        if (rules.lowStockAlert && l.quantity <= rules.lowStockThreshold) {
          const key = `lowstock:${l.listing_id}:${l.quantity}`;
          if (!seenSet.has(key)) {
            seenSet.add(key);
            events.push({
              id: key,
              type: "lowStock",
              title: "Low stock",
              detail: `"${l.title}" has ${l.quantity} left`,
              timestamp: now,
            });
          }
        }
        if (rules.expiringListingAlert && l.ending_tsz) {
          const endsInDays = (l.ending_tsz * 1000 - now) / DAY_MS;
          if (endsInDays > 0 && endsInDays <= rules.expiringWithinDays) {
            const key = `expiring:${l.listing_id}:${l.ending_tsz}`;
            if (!seenSet.has(key)) {
              seenSet.add(key);
              events.push({
                id: key,
                type: "expiring",
                title: "Listing expiring soon",
                detail: `"${l.title}" expires in ${Math.ceil(endsInDays)} day(s)`,
                timestamp: now,
              });
            }
          }
        }
      }
    } catch {
      // Non-fatal.
    }
  }

  // 3. New reviews (and low-rating escalation).
  if (rules.newReviewAlert || rules.lowRatingAlert) {
    try {
      const reviews = await getShopReviews(shopId, 50);
      for (const rev of reviews.results) {
        const key = `review:${rev.listing_id}:${rev.created_timestamp}`;
        if (seenSet.has(key)) continue;
        seenSet.add(key);
        const isLow = rev.rating <= 3;
        if (isLow && rules.lowRatingAlert) {
          events.push({
            id: key,
            type: "lowRating",
            title: `⚠️ ${rev.rating}-star review`,
            detail: rev.review?.slice(0, 120) || "(no text)",
            timestamp: rev.created_timestamp * 1000,
          });
        } else if (rules.newReviewAlert) {
          events.push({
            id: key,
            type: "review",
            title: `New ${rev.rating}-star review`,
            detail: rev.review?.slice(0, 120) || "(no text)",
            timestamp: rev.created_timestamp * 1000,
          });
        }
      }
    } catch {
      // Non-fatal.
    }
  }

  // Persist seen-ids (cap to a reasonable size to avoid unbounded growth).
  const trimmed = Array.from(seenSet).slice(-2000);
  await setItem(StoreKeys.seenReviewIds, trimmed);

  events.sort((a, b) => b.timestamp - a.timestamp);
  return events;
}
