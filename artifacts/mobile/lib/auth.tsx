import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as storage from "@/lib/storage";

WebBrowser.maybeCompleteAuthSession();

const AUTH_TOKEN_KEY = "auth_session_token";
const MOBILE_AUTH_CALLBACK = "myrentcard://auth-callback";

interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  logout: async () => {},
});

function getApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_DOMAIN) {
    return `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
  }
  return "";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const apiBase = getApiBaseUrl();

      if (Platform.OS === "web") {
        const res = await fetch(`${apiBase}/api/auth/user`, {
          credentials: "include",
        });
        const data = await res.json();
        setUser(data.user ?? null);
      } else {
        const token = await storage.getItem(AUTH_TOKEN_KEY);
        if (!token) {
          setUser(null);
          setIsLoading(false);
          return;
        }

        const res = await fetch(`${apiBase}/api/auth/user`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (data.user) {
          setUser(data.user);
        } else {
          await storage.deleteItem(AUTH_TOKEN_KEY);
          setUser(null);
        }
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = useCallback(async () => {
    if (Platform.OS === "web") {
      const apiBase = getApiBaseUrl();
      window.location.href = `${apiBase}/api/login`;
      return;
    }

    const apiBase = getApiBaseUrl();
    if (!apiBase) {
      console.error(
        "[Auth] EXPO_PUBLIC_DOMAIN is not set. Cannot initiate login. " +
          "Ensure EXPO_PUBLIC_DOMAIN is configured in eas.json for all native build profiles.",
      );
      return;
    }

    try {
      setIsLoading(true);
      // Open /api/mobile-auth/start in ASWebAuthenticationSession.
      // The second arg sets callbackURLScheme = "myrentcard" so the session
      // closes automatically when the server redirects to myrentcard://.
      const result = await WebBrowser.openAuthSessionAsync(
        `${apiBase}/api/mobile-auth/start`,
        MOBILE_AUTH_CALLBACK,
      );

      if (result.type === "success" && result.url) {
        const params = new URL(result.url).searchParams;
        const token = params.get("token");
        const error = params.get("error");

        if (token) {
          await storage.setItem(AUTH_TOKEN_KEY, token);
          await fetchUser();
        } else {
          if (error) {
            console.error("[Auth] Login failed:", error);
          }
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    } catch (err) {
      console.error("[Auth] Login error:", err);
      setIsLoading(false);
    }
  }, [fetchUser]);

  const logout = useCallback(async () => {
    if (Platform.OS === "web") {
      const apiBase = getApiBaseUrl();
      window.location.href = `${apiBase}/api/logout`;
      return;
    }
    try {
      const token = await storage.getItem(AUTH_TOKEN_KEY);
      if (token) {
        const apiBase = getApiBaseUrl();
        await fetch(`${apiBase}/api/mobile-auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
    } finally {
      await storage.deleteItem(AUTH_TOKEN_KEY);
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
