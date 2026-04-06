"use client";

import { signOut as nextAuthSignOut, useSession } from "next-auth/react";
import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useMemo } from "react";
import type { Session } from "next-auth";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export interface AuthContextValue {
  status: AuthStatus;
  session: Session | null;
  user: Session["user"] | null;
  isAuthenticated: boolean;
  signOut: (callbackUrl?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();

  const signOut = useCallback(async (callbackUrl = "/login") => {
    await nextAuthSignOut({ callbackUrl });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status: status as AuthStatus,
      session: session ?? null,
      user: session?.user ?? null,
      isAuthenticated: status === "authenticated",
      signOut,
    }),
    [session, signOut, status],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
