// Minimal typings for the subset of Etsy Open API v3 responses this app uses.
// See https://developers.etsy.com/documentation/reference for full schemas.

export interface EtsyTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number; // epoch ms when access_token expires
}

export interface EtsyShop {
  shop_id: number;
  shop_name: string;
  currency_code: string;
  listing_active_count: number;
  num_favorers: number;
  url: string;
}

export interface EtsyMoney {
  amount: number;
  divisor: number;
  currency_code: string;
}

export interface EtsyListing {
  listing_id: number;
  title: string;
  state: string; // active, inactive, draft, expired, sold_out
  quantity: number;
  price: EtsyMoney;
  views: number;
  num_favorers: number;
  ending_tsz?: number; // epoch seconds the listing expires
  tags: string[];
  url: string;
}

export interface EtsyTransactionItem {
  transaction_id: number;
  title: string;
  quantity: number;
  listing_id: number;
}

export interface EtsyReceipt {
  receipt_id: number;
  is_shipped: boolean;
  is_paid: boolean;
  name: string;
  formatted_address: string;
  grandtotal: EtsyMoney;
  created_timestamp: number; // epoch seconds
  transactions: EtsyTransactionItem[];
  status: string;
}

export interface EtsyReview {
  shop_id: number;
  listing_id: number;
  rating: number;
  review: string;
  created_timestamp: number;
  buyer_user_id?: number;
}

export interface Paginated<T> {
  count: number;
  results: T[];
}

export function formatMoney(m?: EtsyMoney): string {
  if (!m) return "—";
  const value = m.amount / (m.divisor || 100);
  return `${m.currency_code} ${value.toFixed(2)}`;
}

export function moneyToNumber(m?: EtsyMoney): number {
  if (!m) return 0;
  return m.amount / (m.divisor || 100);
}
