"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAtom } from "jotai";
import { authenticationStateAtom } from "@/services/identity";
import { CognitoLogin } from "@/components/auth/CognitoLogin";

export default function LoginPage() {
  const [authState] = useAtom(authenticationStateAtom);
  const router = useRouter();
  
  // If already authenticated, redirect to home
  useEffect(() => {
    if (authState === "Authenticated") {
      router.push("/");
    }
  }, [authState, router]);
  
  // In development, automatically authenticate
  useEffect(() => {
    if (process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_USE_COGNITO !== 'true') {
      router.push("/");
    }
  }, [router]);
  
  // Show Cognito login UI
  return <CognitoLogin />;
} 