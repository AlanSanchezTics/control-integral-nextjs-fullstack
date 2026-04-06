import { z } from "zod";

import { createPrismaAuthRepository } from "@/lib/auth/repository";
import { requestPasswordReset } from "@/lib/auth/service";

const requestSchema = z.object({
  email: z.string().trim().email(),
});

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(payload);

  if (!parsed.success) {
    return Response.json(
      { errorCode: "AUTH_INVALID_IDENTIFIER" },
      { status: 400 },
    );
  }

  const repository = createPrismaAuthRepository();
  const result = await requestPasswordReset(
    { email: parsed.data.email },
    repository,
  );

  return Response.json(
    {
      message: result.message,
    },
    { status: 200 },
  );
}
