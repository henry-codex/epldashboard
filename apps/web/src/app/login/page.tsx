"use client";

import { useRouter } from "next/navigation";
import SignInForm from "@/components/sign-in-form";

export default function LoginPage() {
  const router = useRouter();

  return (
    <SignInForm onSwitchToSignUp={() => router.push("/signup")} />
  );
}
