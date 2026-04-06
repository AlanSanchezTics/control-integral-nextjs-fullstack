import nextEnv from "@next/env";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const KEY_LENGTH = 64;

function withPepper(plainPassword, pepper) {
  return `${plainPassword}${pepper}`;
}

function hashPassword(plainPassword, pepper) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(withPepper(plainPassword, pepper), salt, KEY_LENGTH).toString(
    "hex",
  );
  return `${salt}:${hash}`;
}

function normalizePhoneCandidate(raw) {
  const trimmed = raw.trim();

  if (!trimmed) {
    return null;
  }

  if (/[^0-9+\s().-]/.test(trimmed)) {
    return null;
  }

  if (trimmed.includes("+") && !trimmed.startsWith("+")) {
    return null;
  }

  const hasLeadingPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");

  if (digits.length < 7 || digits.length > 15) {
    return null;
  }

  return hasLeadingPlus ? `+${digits}` : digits;
}

function parseCliArgs(argv) {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];

    if (!current) {
      continue;
    }

    if (current === "--help" || current === "-h") {
      options.help = true;
      continue;
    }

    if (current === "--force") {
      options.force = true;
      continue;
    }

    if (!current.startsWith("--")) {
      continue;
    }

    const key = current.slice(2);
    const value = argv[index + 1];

    if (!value || value.startsWith("--")) {
      continue;
    }

    if (key === "email") options.email = value;
    if (key === "password") options.password = value;
    if (key === "name") options.name = value;
    if (key === "phone") options.phone = value;

    index += 1;
  }

  return options;
}

function printUsage() {
  console.info("Create first admin user");
  console.info("");
  console.info("Usage:");
  console.info(
    "  npm run auth:create-first-admin -- --email admin@example.com --password '<SECRET>' --name 'Admin' --phone '+5215512345678'",
  );
  console.info("");
  console.info("Options:");
  console.info("  --email      Required. Admin email.");
  console.info("  --password   Required. Minimum 8 characters.");
  console.info("  --name       Optional. Display name.");
  console.info("  --phone      Optional. Phone in local or E.164 format.");
  console.info("  --force      Optional. Allows creation even if users already exist.");
}

function validateOptions(options) {
  if (!options.email || !options.password) {
    return "Missing required options: --email and --password.";
  }

  const email = options.email.trim().toLowerCase();
  const password = options.password;
  const name = options.name?.trim();
  const phone = options.phone?.trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Invalid email format.";
  }

  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }

  if (name !== undefined && name.length === 0) {
    return "Invalid name.";
  }

  if (phone && !normalizePhoneCandidate(phone)) {
    return "Invalid phone format.";
  }

  return null;
}

async function main() {
  const options = parseCliArgs(process.argv.slice(2));

  if (options.help) {
    printUsage();
    return;
  }

  const validationError = validateOptions(options);
  if (validationError) {
    console.error(validationError);
    printUsage();
    process.exitCode = 1;
    return;
  }

  const passwordPepper = process.env.AUTH_PASSWORD_PEPPER;
  if (!passwordPepper) {
    console.error("Missing AUTH_PASSWORD_PEPPER environment variable.");
    process.exitCode = 1;
    return;
  }

  const databaseUrl =
    process.env.DATABASE_URL ?? "mysql://app:app@localhost:3307/control_integral_app";
  const adapter = new PrismaMariaDb(databaseUrl);
  const prisma = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

  try {
    const normalizedEmail = options.email.trim().toLowerCase();
    const normalizedPhone = options.phone ? normalizePhoneCandidate(options.phone) : null;

    const totalUsers = await prisma.user.count();
    if (totalUsers > 0 && !options.force) {
      console.error("A user already exists. Use --force to create another admin user.");
      process.exitCode = 1;
      return;
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: normalizedEmail },
          normalizedPhone ? { phone: normalizedPhone } : { id: "__never__" },
        ],
      },
      select: { id: true, email: true, phone: true },
    });

    if (existingUser) {
      console.error("A user with the same email or phone already exists.");
      process.exitCode = 1;
      return;
    }

    const passwordHash = hashPassword(options.password, passwordPepper);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        phone: normalizedPhone,
        name: options.name?.trim() || null,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        createdAt: true,
      },
    });

    console.info("Admin user created successfully.");
    console.info(JSON.stringify(user, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error("Failed to create first admin user.");
    console.error(error);
    process.exitCode = 1;
  });
