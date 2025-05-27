import { PropsWithChildren, ReactNode } from "react";

import { Card, CardBody, CardHeader } from "@heroui/card";
import { Divider } from "@heroui/divider";
import { ScrollShadow } from "@heroui/scroll-shadow";

type OutputCardProps = PropsWithChildren<{
  controls?: ReactNode;
}>;

export const OutputCard = ({ controls, children }: OutputCardProps) => (
  <Card radius="sm" shadow="sm">
    {controls && <CardHeader>{controls}</CardHeader>}
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
