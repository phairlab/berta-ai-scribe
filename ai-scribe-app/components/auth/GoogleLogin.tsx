"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAtom } from "jotai";
import { Stethoscope } from "lucide-react";
import { authenticationAtom } from "@/services/identity";
import { authenticateWithGoogle } from "@/services/web-api/authentication";

export function GoogleLogin() {
  const router = useRouter();
  const [, setAuthentication] = useAtom(authenticationAtom);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessingCode, setIsProcessingCode] = useState(false);

  // Hidden debug logging - only logs to console, not displayed in UI
  const logDebug = (message: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(message);
    }
  };

  // Check for existing session
  const checkExistingSession = async () => {
    try {
      logDebug("Checking for existing session...");
      const response = await fetch(`/api/auth/check-session`, {
        method: 'POST',  
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.accessToken) {
          logDebug("Valid session found, updating authentication state");
          setAuthentication({ state: "Authenticated", token: data.accessToken });
          router.push('/');
          return;
        }
      }
      logDebug("No valid session found, showing Google login");
      setIsLoading(false);
    } catch (err) {
      console.error('Session check failed:', err);
      logDebug(`Session check failed: ${err instanceof Error ? err.message : String(err)}`);
      setIsLoading(false);
    }
  };

  // Handle the auth code from Google (for redirect flow)
  const handleAuthCode = async (code: string) => {
    if (isProcessingCode) {
      logDebug("Already processing an authorization code");
      return;
    }

    try {
      setIsProcessingCode(true);
      logDebug("Processing authorization code");
      
      // Clear URL params immediately to prevent multiple attempts
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Exchange code for token using your backend
      const webApiToken = await authenticateWithGoogle(code, undefined, true);
      
      // Update auth state
      setAuthentication({ state: "Authenticated", token: webApiToken });
      
      // Redirect to main app
      router.push('/');
    } catch (err) {
      console.error("Authentication error:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Authentication failed: ${errorMessage}`);
      setIsLoading(false);
    } finally {
      setIsProcessingCode(false);
    }
  };

  useEffect(() => {
    // Check for code in URL (we're returning from Google redirect flow)
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const errorParam = params.get('error');

    logDebug(`URL params: code=${!!code}, error=${errorParam || 'none'}`);

    if (errorParam) {
      logDebug(`Google auth error: ${errorParam}`);
      setError(`Login error: ${errorParam}`);
      setIsLoading(false);
      return;
    }

    if (code) {
      // We have a code, process it
      handleAuthCode(code);
    } else {
      // No code, check for existing session
      checkExistingSession();
    }
  }, []);

  const handleGoogleLogin = () => {
    // Redirect to our backend's Google login endpoint
    window.location.href = '/auth/google-login';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-b from-blue-50 to-white dark:from-slate-900 dark:to-slate-800">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-transparent border-blue-600" />
        <h2 className="mt-4 font-medium text-xl text-blue-700 dark:text-blue-400">
          Jenkins Scribe
        </h2>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-gradient-to-b from-blue-50 to-white dark:from-slate-900 dark:to-slate-800">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-800 dark:to-blue-900 p-6">
          <div className="flex items-center justify-center space-x-2">
            <Stethoscope className="h-8 w-8 text-white" />
            <h1 className="text-2xl font-bold text-white">Jenkins Scribe</h1>
          </div>
        </div>
        <div className="p-6">
          <h2 className="text-xl font-semibold text-center mb-2 text-gray-800 dark:text-gray-200">Welcome Back</h2>
          <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
            Sign in to access your dashboard
          </p>
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 rounded-lg">
              {error}
            </div>
          )}
          <button
            onClick={handleGoogleLogin}
            disabled={isProcessingCode}
            className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors text-gray-700 dark:text-gray-300 font-medium"
          >
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
                <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
                <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
                <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" />
              </g>
            </svg>
            {isProcessingCode ? "Processing..." : "Sign in with Google"}
          </button>
          <div className="mt-4 text-center text-xs text-gray-500 dark:text-gray-500">
            Alberta Health Services &copy; {new Date().getFullYear()}
          </div>
        </div>
      </div>
    </div>
  );
}

// Add TypeScript interface for the Google global object
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: (moment?: any) => void;
          renderButton: (element: HTMLElement, options: any) => void;
        }
      }
    }
  }
}