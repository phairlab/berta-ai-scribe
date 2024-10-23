import "@/styles/globals.css";

import * as React from "react";

import clsx from "clsx";

import { Metadata, Viewport } from "next";

import { Image } from "@nextui-org/image";

import { fontSans } from "@/config/fonts";
import { siteConfig } from "@/config/site";
import { Navbar } from "@/core/navbar";

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
  return (
    <html
      suppressHydrationWarning
      className="overscroll-none min-w-[325px]"
      lang="en"
    >
      <head />
      <body
        className={clsx(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable,
        )}
      >
        <Providers themeProps={{ attribute: "class", defaultTheme: "light" }}>
          <div className="relative flex flex-col h-screen w-full max-w-5xl mx-auto">
            <Navbar />
            <main className="w-full h-full pt-3 sm:pt-6 px-6">{children}</main>
            <footer className="w-full flex flex-row gap-6 items-end justify-center py-3">
              <p className="text-sm text-center text-default-400 mb-1">
                &copy; {new Date().getFullYear()} Alberta Health Services
              </p>
              <Image alt="AHS Logo" src="ahs-color-logo.png" width="100px" />
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
