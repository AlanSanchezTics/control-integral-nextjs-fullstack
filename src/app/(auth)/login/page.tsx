import type { Metadata } from "next";

import SignInForm from "@/components/auth/SignInForm";

export const metadata: Metadata = {
  title: "Iniciar sesión | CIAIG Platform",
  description: "Inicia sesión con tu correo electrónico o número de teléfono.",
};

export default function LoginPage() {
  return <SignInForm callbackUrl="/" />;
}
