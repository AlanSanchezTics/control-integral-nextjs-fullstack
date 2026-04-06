import { z } from "zod";

import { createPrismaAuthRepository } from "@/lib/auth/repository";
import { confirmPasswordReset } from "@/lib/auth/service";

const confirmSchema = z.object({
  email: z.string().trim().email(),
  token: z.string().trim().min(1),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = confirmSchema.safeParse(payload);

  if (!parsed.success) {
    return Response.json(
      { errorCode: "AUTH_INVALID_IDENTIFIER" },
      { status: 400 },
    );
  }

  const passwordPepper = process.env.AUTH_PASSWORD_PEPPER ?? "";
  if (!passwordPepper) {
    return Response.json(
      { errorCode: "AUTH_CONFIGURATION_ERROR" },
      { status: 500 },
    );
  }

  const repository = createPrismaAuthRepository();
  const result = await confirmPasswordReset(
    {
      email: parsed.data.email,
      token: parsed.data.token,
      password: parsed.data.password,
    },
    repository,
    { passwordPepper },
  );

  if (!result.ok) {
    return Response.json({ errorCode: result.errorCode }, { status: 400 });
  }

  return Response.json({ message: result.message }, { status: 200 });
}
