import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";

import { authConfig } from "@/lib/auth/config";

type SessionUser = {
  id?: string | null;
  email?: string | null;
  name?: string | null;
};

type SessionLike = {
  user?: SessionUser;
  sessionExpiresAt?: number;
};

export default async function StorybookProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = (await getServerSession(authConfig)) as SessionLike | null;
  const isAuthenticated = Boolean(
    session?.user &&
      (session.user.id ?? session.user.email ?? session.user.name),
  );
  const isSessionExpired =
    typeof session?.sessionExpiresAt === "number" &&
    Date.now() >= session.sessionExpiresAt;

  if (!isAuthenticated || isSessionExpired) {
    redirect("/login?callbackUrl=/storybook");
  }

  return <>{children}</>;
}
