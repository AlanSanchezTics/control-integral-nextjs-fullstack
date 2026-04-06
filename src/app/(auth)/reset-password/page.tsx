import type { Metadata } from "next";

import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Reset Password | CIAIG Platform",
  description: "Request a reset code and set a new password.",
};

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
