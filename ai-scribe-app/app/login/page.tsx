"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAtom } from "jotai";
import { authenticationStateAtom } from "@/services/identity";
import { CognitoLogin } from "@/components/auth/CognitoLogin";
import { GoogleLogin } from "@/components/auth/GoogleLogin";
import { useRuntimeConfig } from "@/services/state/runtime-config-context";

export default function LoginPage() {
  const [authState] = useAtom(authenticationStateAtom);
  const router = useRouter();
  const runtimeConfig = useRuntimeConfig();
  
  // Read from runtime config
  const useCognito = runtimeConfig.NEXT_PUBLIC_USE_COGNITO === 'true';
  const useGoogleAuth = process.env.NEXT_PUBLIC_USE_GOOGLE_AUTH === 'true';
  
  // If already authenticated, redirect to home
  useEffect(() => {
    if (authState === "Authenticated") {
      router.push("/");
    }
  }, [authState, router]);
  
  // In development, force Google auth if no auth method is enabled
  useEffect(() => {
    if (process.env.NODE_ENV === "development" && !useCognito && !useGoogleAuth) {
      // Force Google auth in development
      process.env.NEXT_PUBLIC_USE_GOOGLE_AUTH = 'true';
    }
  }, [router, useCognito, useGoogleAuth]);
  
  // Determine which login component to show
  if (useCognito) {
    return <CognitoLogin />;
  } else if (useGoogleAuth) {
    return <GoogleLogin />;
  }
  
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-3">Redirecting...</p>
      </div>
    </div>
  );
}