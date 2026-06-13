import { ETSY, getApiKey } from "./config";
import { refresh } from "./auth";
import { EtsyTokens } from "@/types/etsy";
import { StoreKeys, getItem, setItem } from "@/storage/secureStore";

// Auto-refresh tokens a minute before they expire to avoid mid-request 401s.
const REFRESH_SKEW_MS = 60 * 1000;

async function getValidTokens(): Promise<EtsyTokens> {
  const tokens = await getItem<EtsyTokens>(StoreKeys.tokens);
  if (!tokens) throw new Error("Not authenticated. Please log in.");
  if (Date.now() < tokens.expires_at - REFRESH_SKEW_MS) return tokens;

  const fresh = await refresh(tokens.refresh_token);
  await setItem(StoreKeys.tokens, fresh);
  return fresh;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
}

// Central authenticated request helper. Every Etsy v3 call needs both the
// x-api-key header and a Bearer access token.
export async function etsyRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const tokens = await getValidTokens();
  const { method = "GET", query, body } = options;

  let url = `${ETSY.apiBase}${path}`;
  if (query) {
    const qs = Object.entries(query)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join("&");
    if (qs) url += `?${qs}`;
  }

  const res = await fetch(url, {
    method,
    headers: {
      "x-api-key": getApiKey(),
      Authorization: `Bearer ${tokens.access_token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return undefined as T;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Etsy API ${method} ${path} failed (${res.status}): ${text}`);
  }
  return (await res.json()) as T;
}
