"use client";

import type { ReactNode } from "react";
import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";

import { AuthProvider } from "@/context/AuthContext";
import { I18nProvider } from "@/providers/I18nProvider";

export interface AppProvidersProps {
  children: ReactNode;
  session?: Session | null;
}

export function AppProviders({ children, session }: AppProvidersProps) {
  return (
    <I18nProvider>
      <SessionProvider session={session}>
        <AuthProvider>{children}</AuthProvider>
      </SessionProvider>
    </I18nProvider>
  );
}
