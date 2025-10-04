"use client";

import { useState } from "react";

import clsx from "clsx";

import NextLink from "next/link";
import { useRouter } from "next/navigation";

import { Divider } from "@heroui/divider";
import { Link } from "@heroui/link";
import { useDisclosure } from "@heroui/modal";
import {
  Navbar as NextUINavbar,
  NavbarContent,
  NavbarMenu,
  NavbarMenuToggle,
  NavbarBrand,
  NavbarItem,
  NavbarMenuItem,
} from "@heroui/navbar";
import { link as linkStyles } from "@heroui/theme";

import { siteConfig } from "@/config/site";

import { EncounterNavigator } from "@/features/encounter-navigation/encounter-navigator";
import { FeedbackModal } from "@/features/user-feedback/feedback-modal";
import { CurrentUser } from "@/features/user-session/current-user";

import { Logo, SettingsIcon } from "./icons";
import { LinkButton } from "./link-button";
import { ThemeSwitch } from "./theme-switch";

export const Navbar = () => {
  const router = useRouter();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const feedbackModal = useDisclosure();

  return (
    <NextUINavbar
      classNames={{ wrapper: "max-w-full" }}
      isMenuOpen={isMenuOpen}
      position="sticky"
      onMenuOpenChange={setIsMenuOpen}
    >
      <FeedbackModal
        isOpen={feedbackModal.isOpen}
        onClose={feedbackModal.onClose}
        onOpenChange={feedbackModal.onOpenChange}
      />

      <NavbarContent className="basis-1/5 sm:basis-full" justify="start">
        <NavbarBrand as="li" className="gap-3 max-w-fit">
          <NextLink className="flex justify-start items-center gap-1" href="/">
            <Logo className="mr-1" />
            <p className="font-bold text-inherit">BERTA</p>
          </NextLink>
        </NavbarBrand>
        <ul className="hidden lg:flex gap-4 justify-start ml-2">
          {Object.entries(siteConfig.navItems).map(([label, href]) => (
            <NavbarItem key={href}>
              <NextLink
                className={clsx(
                  linkStyles({ color: "foreground" }),
                  "data-[active=true]:text-primary data-[active=true]:font-medium",
                )}
                color="foreground"
                href={href}
              >
                {label}
              </NextLink>
            </NavbarItem>
          ))}
        </ul>
        <NavbarItem className="hidden sm:flex justify-center items-center">
          <LinkButton
            className="text-foreground text-sm"
            onPress={feedbackModal.onOpen}
          >
            Feedback
          </LinkButton>
        </NavbarItem>
      </NavbarContent>

      <NavbarContent
        className="hidden sm:flex basis-1/5 sm:basis-full"
        justify="end"
      >
        <NavbarItem className="hidden sm:flex gap-3 items-center">
          <CurrentUser />
          <NextLink
            aria-label="Settings"
            className="text-zinc-500 hover:text-zinc-400 dark:hover:text-zinc-600"
            href="/settings"
          >
            <SettingsIcon className="mt-[1px]" size={21} />
          </NextLink>
          <ThemeSwitch />
        </NavbarItem>
      </NavbarContent>

      <NavbarContent
        className="flex flex-row items-center max-w-fit sm:hidden basis-1 pl-2"
        justify="end"
      >
        <CurrentUser />
        <ThemeSwitch />
        <NavbarMenuToggle />
      </NavbarContent>

      <NavbarMenu>
        <div className="mx-4 mt-2 flex flex-col gap-4">
          <NavbarMenuItem>
            <Link
              className="text-zinc-600 dark:text-zinc-400"
              color="foreground"
              href="/settings"
              onPress={() => setIsMenuOpen(false)}
            >
              <div className="flex flex-row gap-2">
                <SettingsIcon className="mt-[4px]" size={18} />
                Settings
              </div>
            </Link>
          </NavbarMenuItem>
          <NavbarMenuItem>
            <LinkButton
              className="text-zinc-600 dark:text-zinc-400 ms-[24px]"
              onPress={feedbackModal.onOpen}
            >
              <div className="flex flex-row gap-2">Feedback</div>
            </LinkButton>
          </NavbarMenuItem>
          <Divider className="mt-3" />
          <NavbarMenuItem>
            <EncounterNavigator
              onEncounterSelected={() => {
                router.push("/");
                setIsMenuOpen(false);
              }}
            />
          </NavbarMenuItem>
        </div>
      </NavbarMenu>
    </NextUINavbar>
  );
};
