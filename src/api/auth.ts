import * as AuthSession from "expo-auth-session";
import * as Crypto from "expo-crypto";
import * as WebBrowser from "expo-web-browser";

import { ETSY, ETSY_SCOPES, getApiKey } from "./config";
import { EtsyTokens } from "@/types/etsy";

WebBrowser.maybeCompleteAuthSession();

// The redirect URI uses the custom scheme declared in app.json ("etsyautomator").
// In Expo Go it falls back to the proxy URI automatically.
export function getRedirectUri(): string {
  return AuthSession.makeRedirectUri({ scheme: "etsyautomator", path: "auth" });
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  // btoa is available in React Native's Hermes runtime.
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function makePkcePair(): Promise<{ verifier: string; challenge: string }> {
  const random = await Crypto.getRandomBytesAsync(32);
  const verifier = base64UrlEncode(random);
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    verifier,
    { encoding: Crypto.CryptoEncoding.BASE64 }
  );
  const challenge = digest
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return { verifier, challenge };
}

function randomState(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// The Etsy access token is of the form "<userId>.<random>"; the numeric prefix
// is the authenticated user's id, needed to look up their shop.
export function userIdFromToken(accessToken: string): string {
  return accessToken.split(".")[0];
}

async function exchangeToken(body: Record<string, string>): Promise<EtsyTokens> {
  const res = await fetch(ETSY.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${text}`);
  }
  const json = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
  return {
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    expires_at: Date.now() + json.expires_in * 1000,
  };
}

// Runs the full interactive OAuth 2.0 PKCE login and returns tokens.
export async function login(): Promise<EtsyTokens> {
  const apiKey = getApiKey();
  const redirectUri = getRedirectUri();
  const { verifier, challenge } = await makePkcePair();
  const state = randomState();

  const authUrl =
    `${ETSY.authorizeUrl}?response_type=code` +
    `&client_id=${encodeURIComponent(apiKey)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(ETSY_SCOPES.join(" "))}` +
    `&state=${encodeURIComponent(state)}` +
    `&code_challenge=${encodeURIComponent(challenge)}` +
    `&code_challenge_method=S256`;

  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
  if (result.type !== "success" || !result.url) {
    throw new Error("Login was cancelled.");
  }

  const params = new URL(result.url).searchParams;
  if (params.get("state") !== state) {
    throw new Error("OAuth state mismatch — aborting for safety.");
  }
  const code = params.get("code");
  if (!code) {
    const err = params.get("error_description") || params.get("error");
    throw new Error(`No authorization code returned. ${err ?? ""}`);
  }

  return exchangeToken({
    grant_type: "authorization_code",
    client_id: apiKey,
    redirect_uri: redirectUri,
    code,
    code_verifier: verifier,
  });
}

// Exchanges a refresh token for a fresh access token.
export async function refresh(refreshToken: string): Promise<EtsyTokens> {
  return exchangeToken({
    grant_type: "refresh_token",
    client_id: getApiKey(),
    refresh_token: refreshToken,
  });
}
