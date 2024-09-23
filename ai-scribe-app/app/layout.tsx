import "@/styles/globals.css";
import { Metadata, Viewport } from "next";
import clsx from "clsx";
import { headers } from "next/headers";

import { siteConfig } from "@/config/site";
import { fontSans } from "@/config/fonts";
import { Navbar } from "@/components/navbar";
import { authenticate, fetchAppContextData } from "@/utility/web-api";

import { Providers } from "./providers";

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,
  },
  description: siteConfig.description,
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const snowflakeContextUser = headers().get("sf-context-current-user");
  const userAgent = headers().get("user-agent");
  const jenkinsUserAgent = headers().get("jenkins-user-agent");
  const { accessToken, session } = await authenticate(snowflakeContextUser, jenkinsUserAgent ?? userAgent);
  const appContextData = await fetchAppContextData(accessToken);

  return (
    <html suppressHydrationWarning className="overscroll-none" lang="en">
      <head />
      <body
        className={clsx(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable,
        )}
      >
        <Providers
          appContextData={appContextData}
          sessionData={{ accessToken, session }}
          themeProps={{ attribute: "class", defaultTheme: "light" }}
        >
          <div className="relative flex flex-col h-screen mx-auto max-w-5xl px-6">
            <Navbar />
            <main className="container pt-3 sm:pt-6 px-6 flex-grow">
              {children}
            </main>
            <footer className="w-full flex items-center justify-center py-3">
              <></>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
