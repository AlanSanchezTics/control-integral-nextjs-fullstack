import type { Adapter, AdapterAccount, AdapterUser, VerificationToken } from "next-auth/adapters";
import { PrismaAdapter } from "@auth/prisma-adapter";

import { prisma } from "@/lib/db/prisma";

function toBigIntId(value: string | number | bigint): bigint {
  if (typeof value === "bigint") {
    return value;
  }

  if (typeof value === "number") {
    return BigInt(value);
  }

  return BigInt(value);
}

function toStringId(value: bigint | string | number): string {
  if (typeof value === "bigint") {
    return value.toString();
  }

  return String(value);
}

function mapAdapterUser(user: {
  id: bigint | string | number;
  email: string;
  emailVerified: Date | null;
  name?: string | null;
  image?: string | null;
}): AdapterUser {
  return {
    ...user,
    id: toStringId(user.id),
  };
}

export function createNextAuthBigIntAdapter(client: typeof prisma = prisma): Adapter {
  const base = PrismaAdapter(client as never) as Adapter;

  return {
    ...base,
    async createUser(user: Omit<AdapterUser, "id">) {
      if (!base.createUser) {
        throw new Error("Adapter createUser is not available");
      }

      const created = await base.createUser(user as never);
      return mapAdapterUser(created);
    },
    async getUser(id) {
      const user = await client.user.findUnique({
        where: { id: toBigIntId(id) },
      });

      return user ? mapAdapterUser(user) : null;
    },
    async getUserByEmail(email) {
      const user = await client.user.findUnique({
        where: { email },
      });

      return user ? mapAdapterUser(user) : null;
    },
    async getUserByAccount(providerAccountId) {
      const account = await client.account.findUnique({
        where: { provider_providerAccountId: providerAccountId },
        include: { user: true },
      });

      return account?.user ? mapAdapterUser(account.user) : null;
    },
    async updateUser(user: Partial<AdapterUser> & Pick<AdapterUser, "id">) {
      const updated = await client.user.update({
        where: { id: toBigIntId(user.id) },
        data: {
          ...(user.name !== undefined ? { name: user.name } : {}),
          ...(user.email !== undefined ? { email: user.email } : {}),
          ...(user.emailVerified !== undefined ? { emailVerified: user.emailVerified } : {}),
          ...(user.image !== undefined ? { image: user.image } : {}),
        },
      });

      return mapAdapterUser(updated);
    },
    async deleteUser(userId) {
      const deleted = await client.user.delete({
        where: { id: toBigIntId(userId) },
      });

      return mapAdapterUser(deleted);
    },
    async linkAccount(account: AdapterAccount) {
      const created = await client.account.create({
        data: {
          ...account,
          userId: toBigIntId(account.userId),
        },
      });

      return {
        type: created.type,
        provider: created.provider,
        providerAccountId: created.providerAccountId,
        userId: created.userId.toString(),
        refresh_token: created.refresh_token,
        access_token: created.access_token,
        expires_at: created.expires_at,
        token_type: created.token_type,
        scope: created.scope,
        id_token: created.id_token,
        session_state: created.session_state,
      } as AdapterAccount;
    },
    async unlinkAccount(provider_providerAccountId) {
      const deleted = await client.account.delete({
        where: { provider_providerAccountId },
      });

      return {
        type: deleted.type,
        provider: deleted.provider,
        providerAccountId: deleted.providerAccountId,
        userId: deleted.userId.toString(),
        refresh_token: deleted.refresh_token,
        access_token: deleted.access_token,
        expires_at: deleted.expires_at,
        token_type: deleted.token_type,
        scope: deleted.scope,
        id_token: deleted.id_token,
        session_state: deleted.session_state,
      } as AdapterAccount;
    },
    createSession: undefined,
    getSessionAndUser: undefined,
    updateSession: undefined,
    deleteSession: undefined,
    async createVerificationToken(data) {
      const verificationToken = await client.verificationToken.create({ data });
      return verificationToken as VerificationToken;
    },
    async useVerificationToken(identifier_token) {
      try {
        const verificationToken = await client.verificationToken.delete({
          where: { identifier_token },
        });
        return verificationToken as VerificationToken;
      } catch {
        return null;
      }
    },
  };
}
