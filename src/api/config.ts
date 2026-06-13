import Constants from "expo-constants";

// Etsy Open API v3 endpoints.
export const ETSY = {
  apiBase: "https://openapi.etsy.com/v3/application",
  authorizeUrl: "https://www.etsy.com/oauth/connect",
  tokenUrl: "https://api.etsy.com/v3/public/oauth/token",
};

// OAuth scopes the app requests. Keep this minimal — request only what the
// features actually use. See https://developers.etsy.com/documentation/essentials/authentication
export const ETSY_SCOPES = [
  "shops_r",
  "listings_r",
  "listings_w",
  "transactions_r",
  "transactions_w",
  "profile_r",
];

export function getApiKey(): string {
  const key =
    (Constants.expoConfig?.extra as { etsyApiKey?: string } | undefined)
      ?.etsyApiKey ?? process.env.ETSY_API_KEY;
  if (!key || key.startsWith("REPLACE_")) {
    throw new Error(
      "Etsy API key not set. Add it to app.json -> expo.extra.etsyApiKey."
    );
  }
  return key;
}
