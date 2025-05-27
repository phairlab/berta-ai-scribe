import React, { createContext, useContext, useEffect, useState } from "react";

export type RuntimeConfig = {
    NEXT_PUBLIC_USE_COGNITO?: string;
    NEXT_PUBLIC_COGNITO_DOMAIN?: string;
    NEXT_PUBLIC_COGNITO_CLIENT_ID?: string;
    NEXT_PUBLIC_COGNITO_REDIRECT_URI?: string;
    NEXT_PUBLIC_BACKEND_URL?: string;
};

// Declare the global window type
declare global {
    interface Window {
        __RUNTIME_CONFIG__: RuntimeConfig;
    }
}

const RuntimeConfigContext = createContext<RuntimeConfig | null>(null);

export const useRuntimeConfig = () => {
    const context = useContext(RuntimeConfigContext);
    if (!context) {
        throw new Error('useRuntimeConfig must be used within a RuntimeConfigProvider');
    }
    return context;
};

export const RuntimeConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [config, setConfig] = useState<RuntimeConfig | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadConfig = async () => {
            try {
                setIsLoading(true);
                setError(null);

                let runtimeConfig: RuntimeConfig;
                
                if (process.env.NODE_ENV === 'development') {
                    // In development, use environment variables
                    runtimeConfig = {
                        NEXT_PUBLIC_USE_COGNITO: process.env.NEXT_PUBLIC_USE_COGNITO,
                        NEXT_PUBLIC_COGNITO_DOMAIN: process.env.NEXT_PUBLIC_COGNITO_DOMAIN,
                        NEXT_PUBLIC_COGNITO_CLIENT_ID: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID,
                        NEXT_PUBLIC_COGNITO_REDIRECT_URI: process.env.NEXT_PUBLIC_COGNITO_REDIRECT_URI,
                        NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
                    };
                } else {
                    // In production, load from runtime-config.json
                    const response = await fetch('/runtime-config.json');
                    if (!response.ok) {
                        throw new Error(`Failed to load runtime config: ${response.statusText}`);
                    }
                    runtimeConfig = await response.json();
                }

                // Validate required fields
                if (runtimeConfig.NEXT_PUBLIC_BACKEND_URL === '') {
                    console.warn('NEXT_PUBLIC_BACKEND_URL is not set in runtime config');
                }

                // Set the config in both state and window object
                setConfig(runtimeConfig);
                if (typeof window !== 'undefined') {
                    window.__RUNTIME_CONFIG__ = runtimeConfig;
                }
            } catch (err) {
                console.error('Error loading runtime config:', err);
                setError(err instanceof Error ? err : new Error('Failed to load runtime config'));
                // Set default config to prevent app from breaking
                const defaultConfig = {
                    NEXT_PUBLIC_USE_COGNITO: 'false',
                    NEXT_PUBLIC_BACKEND_URL: '',
                };
                setConfig(defaultConfig);
                if (typeof window !== 'undefined') {
                    window.__RUNTIME_CONFIG__ = defaultConfig;
                }
            } finally {
                setIsLoading(false);
            }
        };

        loadConfig();
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error) {
        console.error('Runtime config error:', error);
        // Still render children with default config to prevent app from breaking
    }

    return (
        <RuntimeConfigContext.Provider value={config || {}}>
            {children}
        </RuntimeConfigContext.Provider>
    );
};