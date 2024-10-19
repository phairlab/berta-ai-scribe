import { Key, PropsWithChildren } from "react";

import { useRouter } from "next/navigation";

import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@nextui-org/dropdown";

type SessionDropdownProps = PropsWithChildren;

export const SessionDropdown = ({ children }: SessionDropdownProps) => {
  const router = useRouter();

  const handleAction = (key: Key) => {
    if (key === "logout") {
      if (process.env.NODE_ENV === "development") {
        window.location.reload();
      } else {
        void fetch("/sfc-endpoint/logout").then(() => router.refresh());
      }
    }
  };

  return (
    <Dropdown>
      <DropdownTrigger>{children}</DropdownTrigger>
      <DropdownMenu aria-label="User session controls" onAction={handleAction}>
        <DropdownItem key="logout">Logout</DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
};
