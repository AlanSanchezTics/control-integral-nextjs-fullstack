import type { Metadata } from "next";

import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Restablecer contraseña | CIAIG Platform",
  description: "Solicita un código de restablecimiento y define una nueva contraseña.",
};

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
