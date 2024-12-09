import { PropsWithChildren, ReactNode } from "react";

import { Card, CardBody, CardHeader } from "@nextui-org/card";
import { Divider } from "@nextui-org/divider";
import { ScrollShadow } from "@nextui-org/scroll-shadow";

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
