import type { Metadata } from "next";

import SignInForm from "@/components/auth/SignInForm";

export const metadata: Metadata = {
  title: "Login | CIAIG Platform",
  description: "Sign in with your email address or phone number.",
};

export default function LoginPage() {
  return <SignInForm callbackUrl="/" />;
}
