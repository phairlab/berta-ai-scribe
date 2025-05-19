import "@/styles/globals.css";

import * as React from "react";

import clsx from "clsx";

import { Metadata, Viewport } from "next";
import Image from "next/image";

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
          "h-screen min-h-screen bg-background font-sans antialiased overscroll-y-contain",
          fontSans.variable,
        )}
      >
        <Providers themeProps={{ attribute: "class", defaultTheme: "light" }}>
          <div className="relative flex flex-col min-h-screen w-full max-w-6xl mx-auto">
            <Navbar />
            <main className="w-full grow pt-3 sm:pt-6 px-6">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
