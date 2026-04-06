import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

export function hashPassword(plainPassword: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(plainPassword, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(plainPassword: string, storedPasswordHash: string): boolean {
  const [salt, originalHash] = storedPasswordHash.split(":");

  if (!salt || !originalHash) {
    return false;
  }

  const hashBuffer = scryptSync(plainPassword, salt, KEY_LENGTH);
  const originalHashBuffer = Buffer.from(originalHash, "hex");

  if (hashBuffer.length !== originalHashBuffer.length) {
    return false;
  }

  return timingSafeEqual(hashBuffer, originalHashBuffer);
}
