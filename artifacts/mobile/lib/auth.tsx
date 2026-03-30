import React, { createContext, useContext, useCallback, useEffect, useState, type ReactNode } from "react";
import { createClient } from "@supabase/supabase-js";
import { setAuthTokenGetter } from "@workspace/api-client-react";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  logout: async () => {},
});

const DEV_BYPASS = process.env.EXPO_PUBLIC_DEV_BYPASS === "true";

const DEV_USER: User = {
  id: "usr_test_001",
  email: "jbd7899@demo.com",
  firstName: "Jordan",
  lastName: "Demo",
  profileImageUrl: null,
};

// ---------------------------------------------------------------------------
// Module-level token cache — lives for the lifetime of the JS module and
// survives React component remounts, Strict Mode double-invocation, and any
// other React lifecycle events.
// ---------------------------------------------------------------------------
let _cachedToken: string | null = null;

if (DEV_BYPASS) {
  setAuthTokenGetter(async () => "dev-bypass-token");
} else {
  // Register the getter once at module init time.  When called it returns the
  // cached token immediately; falls back to getSession() on cold start (before
  // the module-level onAuthStateChange subscription has fired).
  setAuthTokenGetter(async () => {
    if (_cachedToken) return _cachedToken;
    try {
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token ?? null;
    } catch {
      return null;
    }
  });

  // Keep the cache in sync for the entire lifetime of the module — this
  // subscription is never unsubscribed and is independent of any component.
  supabase.auth.onAuthStateChange((_event, session) => {
    _cachedToken = session?.access_token ?? null;
  });
}

/**
 * Explicitly populate the module-level token cache.  Call this immediately
 * after a successful verifyOtp so the token is available before the app's
 * tabs mount and React Query fires its first requests.
 */
export function primeCachedToken(token: string | null) {
  _cachedToken = token;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(DEV_BYPASS ? DEV_USER : null);
  const [isLoading, setIsLoading] = useState(!DEV_BYPASS);

  useEffect(() => {
    if (DEV_BYPASS) return;

    // This component-level subscription only drives React state (user,
    // isLoading). Token caching is handled by the module-level subscription
    // above so it cannot be disrupted by component remounts.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
      } else if (session?.user) {
        setUser(sessionToUser(session.user));
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = useCallback(async () => {
    if (DEV_BYPASS) return;
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

function sessionToUser(u: { id: string; email?: string; user_metadata?: Record<string, unknown> }): User {
  const meta = u.user_metadata ?? {};
  return {
    id: u.id,
    email: u.email ?? null,
    firstName: (meta.first_name as string | null) ?? (meta.full_name as string | null)?.split(" ")[0] ?? null,
    lastName: (meta.last_name as string | null) ?? ((meta.full_name as string | null)?.split(" ").slice(1).join(" ") || null),
    profileImageUrl: (meta.avatar_url as string | null) ?? null,
  };
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
