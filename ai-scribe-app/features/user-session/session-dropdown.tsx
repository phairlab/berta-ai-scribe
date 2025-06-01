"use client";

import { Key, PropsWithChildren, useState } from "react";

import { useRouter } from "next/navigation";

import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@heroui/dropdown";

import { sessionKeys } from "@/config/keys";
import { useRuntimeConfig } from "@/services/state/runtime-config-context";


type SessionDropdownProps = PropsWithChildren;

export const SessionDropdown = ({ children }: SessionDropdownProps) => {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const runtimeConfig = useRuntimeConfig();

  const handleAction = async (key: Key) => {
    if (key === "logout" && !isLoggingOut) {
      try {
        setIsLoggingOut(true);
        sessionStorage.clear();
        
        const sessionToken = sessionStorage.getItem(sessionKeys.AccessToken);
        
        if (runtimeConfig.NEXT_PUBLIC_USE_COGNITO === 'true') {
          console.log('Attempting Cognito logout...');
          const response = await fetch(`/auth/logout`, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${sessionToken}`,
            },
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            console.error('Logout response error:', {
              status: response.status,
              statusText: response.statusText,
              error: errorData
            });
            throw new Error(errorData.detail || 'Logout failed');
          }
          
          document.cookie.split(";").forEach(function(c) { 
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
          });
          
          console.log('Logout successful, redirecting to login...');
          window.location.href = '/login';
        } else if (process.env.NEXT_PUBLIC_USE_GOOGLE_AUTH === 'true') {
          console.log('Attempting Google auth logout...');
          const response = await fetch(`/auth/logout`, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${sessionToken}`,
            },
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            console.error('Logout response error:', {
              status: response.status,
              statusText: response.statusText,
              error: errorData
            });
            throw new Error(errorData.detail || 'Logout failed');
          }
          
          document.cookie.split(";").forEach(function(c) { 
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
          });
          
          console.log('Logout successful, redirecting to login...');
          window.location.href = '/login';
        } else if (process.env.NODE_ENV === "development") {
          window.location.reload();
        } else {
          await fetch(`/sfc-endpoint/logout`, {
            credentials: 'include',
            headers: {
              'Authorization': `Bearer ${sessionToken}`,
            },
          });
          router.refresh();
        }
      } catch (error) {
        console.error('Logout error:', error);
        setIsLoggingOut(false);
      }
    }
  };

  return (
    <Dropdown>
      <DropdownTrigger>{children}</DropdownTrigger>
      <DropdownMenu aria-label="User session controls" onAction={handleAction}>
        <DropdownItem 
          key="logout" 
          isDisabled={isLoggingOut}
        >
          {isLoggingOut ? 'Logging out...' : 'Logout'}
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
};
