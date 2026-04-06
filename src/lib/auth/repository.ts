import { prisma } from "../db/prisma";
import { parseLoginIdentifier } from "./identifier";
import type {
  AuthUserRecord,
  CreatePasswordResetTokenInput,
  LoginAttemptRecordInput,
  PasswordResetTokenRecord,
} from "./types";

export interface AuthPrismaUserDelegate {
  findFirst(args: {
    where: {
      OR: Array<{ email?: string; phone?: string }>;
    };
  }): Promise<AuthUserRecord | null>;
  update(args: {
    where: { id: string };
    data: Partial<AuthUserRecord> & {
      failedLoginAttempts?: number;
      lockedUntil?: Date | null;
      lastLoginAt?: Date | null;
      passwordHash?: string | null;
    };
  }): Promise<AuthUserRecord>;
}

export interface AuthPrismaLoginAttemptDelegate {
  create(args: { data: LoginAttemptRecordInput }): Promise<unknown>;
}

export interface AuthPrismaPasswordResetTokenDelegate {
  create(args: { data: CreatePasswordResetTokenInput }): Promise<unknown>;
  findFirst(args: {
    where: {
      token?: string;
      userId?: string;
      identifier?: string;
    };
  }): Promise<PasswordResetTokenRecord | null>;
  update(args: {
    where: { id: string };
    data: Partial<PasswordResetTokenRecord>;
  }): Promise<PasswordResetTokenRecord>;
}

export interface AuthPrismaClient {
  user: AuthPrismaUserDelegate;
  loginAttempt?: AuthPrismaLoginAttemptDelegate;
  passwordResetToken?: AuthPrismaPasswordResetTokenDelegate;
}

export interface AuthRepository {
  findUserByIdentifier(identifier: string): Promise<AuthUserRecord | null>;
  updateUserAuthState(
    userId: string,
    data: Pick<AuthUserRecord, "failedLoginAttempts" | "lockedUntil" | "lastLoginAt">,
  ): Promise<void>;
  updateUserPasswordHash(userId: string, passwordHash: string): Promise<void>;
  recordLoginAttempt(input: LoginAttemptRecordInput): Promise<void>;
  createPasswordResetToken(input: CreatePasswordResetTokenInput): Promise<void>;
  findPasswordResetTokenByHash(tokenHash: string): Promise<PasswordResetTokenRecord | null>;
  consumePasswordResetToken(tokenId: string, consumedAt: Date): Promise<void>;
}

export function createPrismaAuthRepository(client: AuthPrismaClient = prisma as unknown as AuthPrismaClient): AuthRepository {
  return {
    async findUserByIdentifier(identifier) {
      const parsed = parseLoginIdentifier(identifier);

      if (!parsed) {
        return null;
      }

      return client.user.findFirst({
        where: {
          OR:
            parsed.kind === "email"
              ? [{ email: parsed.value }, { phone: parsed.value }]
              : [{ phone: parsed.value }, { email: parsed.value }],
        },
      });
    },
    async updateUserAuthState(userId, data) {
      await client.user.update({
        where: { id: userId },
        data,
      });
    },
    async updateUserPasswordHash(userId, passwordHash) {
      await client.user.update({
        where: { id: userId },
        data: {
          passwordHash,
        },
      });
    },
    async recordLoginAttempt(input) {
      await client.loginAttempt?.create({
        data: input,
      });
    },
    async createPasswordResetToken(input) {
      await client.passwordResetToken?.create({
        data: input,
      });
    },
    async findPasswordResetTokenByHash(tokenHash) {
      return client.passwordResetToken?.findFirst({
        where: {
          token: tokenHash,
        },
      }) ?? null;
    },
    async consumePasswordResetToken(tokenId, consumedAt) {
      await client.passwordResetToken?.update({
        where: { id: tokenId },
        data: {
          usedAt: consumedAt,
        },
      });
    },
  };
}
