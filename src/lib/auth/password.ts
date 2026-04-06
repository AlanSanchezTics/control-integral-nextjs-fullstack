import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const KEY_LENGTH = 64;

function withPepper(plainPassword: string, pepper: string): string {
  return `${plainPassword}${pepper}`;
}

export function hashPassword(plainPassword: string, pepper: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(withPepper(plainPassword, pepper), salt, KEY_LENGTH).toString(
    "hex",
  );
  return `${salt}:${hash}`;
}

export function verifyPassword(
  plainPassword: string,
  storedPasswordHash: string,
  pepper: string,
): boolean {
  const [salt, originalHash] = storedPasswordHash.split(":");

  if (!salt || !originalHash) {
    return false;
  }

  const hashBuffer = scryptSync(withPepper(plainPassword, pepper), salt, KEY_LENGTH);
  const originalHashBuffer = Buffer.from(originalHash, "hex");

  if (hashBuffer.length !== originalHashBuffer.length) {
    return false;
  }

  return timingSafeEqual(hashBuffer, originalHashBuffer);
}
