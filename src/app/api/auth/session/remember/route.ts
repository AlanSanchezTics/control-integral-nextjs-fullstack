import { z } from "zod";
import { cookies } from "next/headers";

import { prisma } from "@/lib/db/prisma";
import {
  AUTH_REMEMBER_SESSION_MAX_AGE_SECONDS,
  AUTH_STANDARD_SESSION_MAX_AGE_SECONDS,
} from "@/lib/auth/constants";

const rememberSchema = z.object({
  rememberMe: z.boolean(),
});

const SESSION_COOKIE_NAMES = [
  "__Secure-next-auth.session-token",
  "next-auth.session-token",
  "__Secure-authjs.session-token",
  "authjs.session-token",
];

function resolveSessionTokenFromCookies(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  for (const cookieName of SESSION_COOKIE_NAMES) {
    const value = cookieStore.get(cookieName)?.value;
    if (value) {
      return value;
    }
  }

  return null;
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = rememberSchema.safeParse(payload);

  if (!parsed.success) {
    return Response.json({ errorCode: "AUTH_BAD_REQUEST" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const sessionToken = resolveSessionTokenFromCookies(cookieStore);

  if (!sessionToken) {
    return Response.json({ errorCode: "AUTH_UNAUTHORIZED" }, { status: 401 });
  }

  const now = new Date();
  const maxAgeSeconds = parsed.data.rememberMe
    ? AUTH_REMEMBER_SESSION_MAX_AGE_SECONDS
    : AUTH_STANDARD_SESSION_MAX_AGE_SECONDS;
  const expires = new Date(now.getTime() + maxAgeSeconds * 1000);

  const updated = await prisma.session.updateMany({
    where: { sessionToken },
    data: { expires },
  });

  if (!updated.count) {
    return Response.json({ errorCode: "AUTH_UNAUTHORIZED" }, { status: 401 });
  }

  return Response.json({ expires: expires.toISOString() }, { status: 200 });
}
