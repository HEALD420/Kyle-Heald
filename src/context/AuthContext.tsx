import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { login as doLogin, userIdFromToken } from "@/api/auth";
import { getMyShop } from "@/api/endpoints";
import { EtsyShop, EtsyTokens } from "@/types/etsy";
import { StoreKeys, getItem, removeItem, setItem } from "@/storage/secureStore";

interface AuthState {
  loading: boolean;
  isAuthenticated: boolean;
  shop: EtsyShop | null;
  userId: string | null;
  error: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshShop: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState<EtsyShop | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadShop = useCallback(async (uid: string) => {
    const fetched = await getMyShop(uid);
    setShop(fetched);
    await setItem(StoreKeys.shopId, fetched.shop_id);
  }, []);

  // Restore any saved session on startup.
  useEffect(() => {
    (async () => {
      try {
        const tokens = await getItem<EtsyTokens>(StoreKeys.tokens);
        if (tokens) {
          const uid = userIdFromToken(tokens.access_token);
          setUserId(uid);
          await loadShop(uid);
        }
      } catch (e) {
        // Session restore failed (e.g. revoked token) — fall back to logged out.
        await removeItem(StoreKeys.tokens);
      } finally {
        setLoading(false);
      }
    })();
  }, [loadShop]);

  const login = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const tokens = await doLogin();
      await setItem(StoreKeys.tokens, tokens);
      const uid = userIdFromToken(tokens.access_token);
      setUserId(uid);
      await setItem(StoreKeys.userId, uid);
      await loadShop(uid);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  }, [loadShop]);

  const logout = useCallback(async () => {
    await removeItem(StoreKeys.tokens);
    await removeItem(StoreKeys.shopId);
    await removeItem(StoreKeys.userId);
    setShop(null);
    setUserId(null);
  }, []);

  const refreshShop = useCallback(async () => {
    if (userId) await loadShop(userId);
  }, [userId, loadShop]);

  const value = useMemo<AuthState>(
    () => ({
      loading,
      isAuthenticated: !!shop,
      shop,
      userId,
      error,
      login,
      logout,
      refreshShop,
    }),
    [loading, shop, userId, error, login, logout, refreshShop]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
