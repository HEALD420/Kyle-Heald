import { etsyRequest } from "./etsyClient";
import {
  EtsyListing,
  EtsyReceipt,
  EtsyReview,
  EtsyShop,
  Paginated,
} from "@/types/etsy";

// --- Shop / profile -------------------------------------------------------

// Returns the shop owned by the authenticated user.
export async function getMyShop(userId: string): Promise<EtsyShop> {
  return etsyRequest<EtsyShop>(`/users/${userId}/shops`);
}

export async function getShop(shopId: number): Promise<EtsyShop> {
  return etsyRequest<EtsyShop>(`/shops/${shopId}`);
}

// --- Listings & inventory -------------------------------------------------

export async function getActiveListings(
  shopId: number,
  limit = 100,
  offset = 0
): Promise<Paginated<EtsyListing>> {
  return etsyRequest<Paginated<EtsyListing>>(
    `/shops/${shopId}/listings/active`,
    { query: { limit, offset } }
  );
}

export async function getListingsByState(
  shopId: number,
  state: "active" | "inactive" | "draft" | "expired" | "sold_out",
  limit = 100
): Promise<Paginated<EtsyListing>> {
  return etsyRequest<Paginated<EtsyListing>>(`/shops/${shopId}/listings`, {
    query: { state, limit },
  });
}

// Partial update of a listing. Pass only the fields you want to change.
export async function updateListing(
  shopId: number,
  listingId: number,
  changes: { price?: number; quantity?: number; state?: string; tags?: string }
): Promise<EtsyListing> {
  return etsyRequest<EtsyListing>(
    `/shops/${shopId}/listings/${listingId}`,
    { method: "PUT", body: changes }
  );
}

// --- Orders (receipts) ----------------------------------------------------

export async function getReceipts(
  shopId: number,
  filters: { was_shipped?: boolean; was_paid?: boolean; limit?: number } = {}
): Promise<Paginated<EtsyReceipt>> {
  return etsyRequest<Paginated<EtsyReceipt>>(`/shops/${shopId}/receipts`, {
    query: {
      was_shipped: filters.was_shipped,
      was_paid: filters.was_paid,
      limit: filters.limit ?? 50,
    },
  });
}

// Adds tracking to a receipt, which marks the order as shipped and (optionally)
// notifies the buyer.
export async function markShipped(
  shopId: number,
  receiptId: number,
  tracking: { tracking_code: string; carrier_name: string; send_bcc?: boolean }
): Promise<EtsyReceipt> {
  return etsyRequest<EtsyReceipt>(
    `/shops/${shopId}/receipts/${receiptId}/tracking`,
    { method: "POST", body: tracking }
  );
}

// --- Reviews --------------------------------------------------------------

export async function getShopReviews(
  shopId: number,
  limit = 50
): Promise<Paginated<EtsyReview>> {
  return etsyRequest<Paginated<EtsyReview>>(`/shops/${shopId}/reviews`, {
    query: { limit },
  });
}
