import { getServerSession } from "next-auth/next";
import type { Session } from "next-auth";
import { Outfit } from "next/font/google";

import "./globals.css";
import "flatpickr/dist/flatpickr.css";
import { AppProviders } from "@/providers/AppProviders";
import { authConfig } from "@/lib/auth/config";
import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';

const outfit = Outfit({
  subsets: ["latin"],
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = (await getServerSession(authConfig)) as Session | null;

  return (
    <html lang="es">
      <body className={`${outfit.className} dark:bg-gray-900`}>
        <AppProviders session={session}>
          <ThemeProvider>
            <SidebarProvider>{children}</SidebarProvider>
          </ThemeProvider>
        </AppProviders>
      </body>
    </html>
  );
}
