export type AppEnv = {
  DATABASE_URL: string;
  AUTH_SECRET: string;
  AUTH_PASSWORD_PEPPER: string;
  AUTH_TRUST_HOST: boolean;
};

function requireEnv(name: string, source: NodeJS.ProcessEnv): string {
  const value = source[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export function getEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  return {
    DATABASE_URL: requireEnv("DATABASE_URL", source),
    AUTH_SECRET: requireEnv("AUTH_SECRET", source),
    AUTH_PASSWORD_PEPPER: requireEnv("AUTH_PASSWORD_PEPPER", source),
    AUTH_TRUST_HOST: (source.AUTH_TRUST_HOST ?? "false") === "true",
  };
}
