import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

import { prisma } from "../db/prisma";
import { AUTH_REMEMBER_SESSION_MAX_AGE_SECONDS } from "./constants";
import { createPrismaAuthRepository } from "./repository";
import {
  authenticateCredentials,
  resolveSessionMaxAgeSeconds,
} from "./service";

const credentialsSchema = z.object({
  identifier: z.string().trim().min(1),
  password: z.string().min(8),
  rememberMe: z
    .preprocess((value) => {
      if (value === true || value === "true" || value === "on" || value === "1") {
        return true;
      }

      return false;
    }, z.boolean())
    .optional(),
});
const passwordPepper = process.env.AUTH_PASSWORD_PEPPER ?? "";
const authRepository = createPrismaAuthRepository();

function readRequestHeader(
  req: unknown,
  headerName: string,
): string | null {
  const maybeRequest = req as
    | {
        headers?: {
          get?: (name: string) => string | null;
          [key: string]: unknown;
        };
      }
    | undefined;

  if (!maybeRequest?.headers) {
    return null;
  }

  if (typeof maybeRequest.headers.get === "function") {
    return maybeRequest.headers.get(headerName);
  }

  const headerValue = maybeRequest.headers[headerName.toLowerCase()];

  if (Array.isArray(headerValue)) {
    return headerValue[0] ?? null;
  }

  return typeof headerValue === "string" ? headerValue : null;
}

export function getAuthSessionOptions(rememberMe = false) {
  return {
    strategy: "database" as const,
    maxAge: resolveSessionMaxAgeSeconds(rememberMe),
    updateAge: AUTH_REMEMBER_SESSION_MAX_AGE_SECONDS,
  };
}

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  session: getAuthSessionOptions(false),
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        identifier: { label: "Email or phone", type: "text" },
        password: { label: "Password", type: "password" },
        rememberMe: { label: "Remember me", type: "checkbox" },
      },
      async authorize(credentials, req) {
        if (!passwordPepper) {
          return null;
        }

        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const result = await authenticateCredentials(
          {
            identifier: parsed.data.identifier,
            password: parsed.data.password,
            rememberMe: parsed.data.rememberMe ?? false,
          },
          authRepository,
          {
            passwordPepper,
            ipAddress:
              readRequestHeader(req, "x-forwarded-for") ??
              readRequestHeader(req, "x-real-ip"),
            userAgent: readRequestHeader(req, "user-agent"),
          },
        );

        if (!result.ok) {
          return null;
        }

        return result.user;
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  secret: process.env.AUTH_SECRET,
  trustHost: process.env.AUTH_TRUST_HOST === "true",
};
