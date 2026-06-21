import { AuthForm } from "@/components/auth/AuthForm";

export const metadata = { title: "Sign in — Sentinel" };

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
