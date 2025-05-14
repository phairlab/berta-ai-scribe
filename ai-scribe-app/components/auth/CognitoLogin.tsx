"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAtom } from "jotai";
import { authenticationAtom } from "@/services/identity";
import { authenticateWithCognito } from "@/services/web-api/authentication";

// Get configuration from environment variables
const cognitoDomain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN;
const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;
const redirectUri = process.env.NEXT_PUBLIC_COGNITO_REDIRECT_URI;

export function CognitoLogin() {
  const router = useRouter();
  const [, setAuthentication] = useAtom(authenticationAtom);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugMessage, setDebugMessage] = useState<string>('');

  const addDebug = (message: string) => {
    console.log(message);
    setDebugMessage(prev => prev + '\n' + message);
  };

  // Check for existing session
  useEffect(() => {
    const checkSession = async () => {
      try {
        addDebug("Checking for existing session...");
        const response = await fetch('/api/auth/check-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.accessToken) {
            addDebug("Valid session found, updating authentication state");
            setAuthentication({ state: "Authenticated", token: data.accessToken });
            router.push('/');
            return;
          }
        }
        addDebug("No valid session found, redirecting to Cognito login");
        redirectToCognito();
      } catch (err) {
        console.error('Session check failed:', err);
        addDebug(`Session check failed: ${err instanceof Error ? err.message : String(err)}`);
        redirectToCognito();
      }
    };

    checkSession();
  }, []);

  const redirectToCognito = () => {
    if (!cognitoDomain || !clientId || !redirectUri) {
      setError("Missing Cognito configuration");
      setIsLoading(false);
      return;
    }
    // Check for code in URL (we're returning from Cognito)
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const errorParam = params.get('error');
    const errorDescription = params.get('error_description');

    addDebug(`URL params: code=${!!code}, error=${errorParam || 'none'}, desc=${errorDescription || 'none'}`);

    if (errorParam) {
      addDebug(`Cognito auth error: ${errorParam} - ${errorDescription || 'no description'}`);
      setError(`Login error: ${errorParam}${errorDescription ? ': ' + errorDescription : ''}`);
      setIsLoading(false);
      return;
    }

    if (code) {
      // We have a code, process it
      handleAuthCode(code);
    } else {
      // No code, redirect to Cognito login
      try {
        const safeClientId = encodeURIComponent(clientId);
        const safeRedirectUri = encodeURIComponent(redirectUri);
        const authUrl = `${cognitoDomain}/login?client_id=${safeClientId}&response_type=code&scope=openid+email+profile&redirect_uri=${safeRedirectUri}`;
        addDebug(`Redirecting to: ${authUrl}`);
        addDebug(`Using redirect URI: ${redirectUri}`);
        window.location.href = authUrl;
      } catch (err) {
        console.error("Error redirecting to Cognito:", err);
        setError("Failed to redirect to login page");
        setIsLoading(false);
      }
    }
  };
  
  // Handle the auth code from Cognito
  const handleAuthCode = async (code: string) => {
    try {
      addDebug("Processing authorization code");
      // Get token from API using the auth code
      const webApiToken = await authenticateWithCognito(code);
      
      // Update auth state
      setAuthentication({ state: "Authenticated", token: webApiToken });
      
      // Clear URL params
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Redirect to main app
      router.push('/');
    } catch (err) {
      console.error("Authentication error:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Authentication failed: ${errorMessage}`);
      addDebug(`Auth error: ${errorMessage}`);
      setIsLoading(false);
    }
  };

  // Only show this if there's an error and we're not redirecting
  if (isLoading && !error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-3">Redirecting to login...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
      <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">AHS Jenkins Scribe</h1>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}
        
        <div className="mb-4">
          <button
            onClick={() => {
              setIsLoading(true);
              try {
                const safeClientId = encodeURIComponent(clientId || '');
                const safeRedirectUri = encodeURIComponent(redirectUri || '');
                const authUrl = `${cognitoDomain}/login?client_id=${safeClientId}&response_type=code&scope=openid+email+profile&redirect_uri=${safeRedirectUri}`;
                addDebug(`Manual redirect to: ${authUrl}`);
                window.location.href = authUrl;
              } catch (err) {
                console.error("Error redirecting to Cognito:", err);
                setError("Failed to redirect to login page");
                setIsLoading(false);
              }
            }}
              
            className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
        
        <div className="mt-4 p-3 bg-gray-100 rounded text-xs text-gray-700 overflow-auto max-h-40">
          <strong>Debug Info:</strong>
          <pre>{debugMessage}</pre>
          <p className="mt-2"><strong>Redirect URI:</strong> {redirectUri}</p>
          <p><strong>Cognito Domain:</strong> {cognitoDomain}</p>
          <p><strong>Client ID:</strong> {clientId}</p>
        </div>
      </div>
    </div>
  );
} 