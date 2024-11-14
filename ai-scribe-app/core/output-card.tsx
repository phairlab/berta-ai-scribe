import { PropsWithChildren, ReactNode } from "react";

import { Card, CardBody, CardHeader } from "@nextui-org/card";
import { Divider } from "@nextui-org/divider";
import { ScrollShadow } from "@nextui-org/scroll-shadow";

type OutputCardProps = PropsWithChildren<{
  title: ReactNode | undefined;
  controls: ReactNode;
}>;

export const OutputCard = ({ title, controls, children }: OutputCardProps) => (
  <Card radius="sm" shadow="sm">
    <CardHeader className="flex flex-row gap-4 justify-between items-center">
      <div className="text-lg font-semibold">{title}</div>
      <div className="flex flex-row items-center gap-2">{controls}</div>
    </CardHeader>
    <Divider />
    <CardBody>
      <ScrollShadow className="max-h-[500px]">
        <div className="text-left max-w-full whitespace-pre-wrap">
          {children}
        </div>
      </ScrollShadow>
    </CardBody>
  </Card>
);
