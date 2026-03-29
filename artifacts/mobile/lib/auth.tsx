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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Wire Supabase session token into the API client
    setAuthTokenGetter(async () => {
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token ?? null;
    });

    // Load existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(sessionToUser(session.user));
      }
      setIsLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? sessionToUser(session.user) : null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = useCallback(async () => {
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
