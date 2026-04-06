import NextAuth from "next-auth";

import { authConfig } from "./lib/auth/config";

const nextAuthHandler = NextAuth(authConfig);

export const GET = nextAuthHandler;
export const POST = nextAuthHandler;
