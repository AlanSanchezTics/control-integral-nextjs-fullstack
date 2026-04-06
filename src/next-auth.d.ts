import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    rememberMe: boolean;
    sessionExpiresAt: number;
    user: DefaultSession["user"] & {
      id?: string;
    };
  }

  interface User {
    rememberMe?: boolean;
    sessionMaxAgeSeconds?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    rememberMe?: boolean;
    sessionExpiresAt?: number;
  }
}
