import { AuthForm } from "@/components/auth-form";
import { Suspense } from "react";

export default function AuthPage() {
  return (
    <Suspense fallback={<p className="px-4 py-10 text-sm">Loading…</p>}>
      <AuthForm />
    </Suspense>
  );
}
