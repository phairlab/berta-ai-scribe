import { DetailedHTMLProps, HTMLAttributes, PropsWithChildren } from "react";

type TitledParagraphProps = PropsWithChildren<{
  title: string;
}> &
  DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>;

export const TitledParagraph = ({
  title,
  children,
  ...props
}: TitledParagraphProps) => (
  <div {...props}>
    <p className="font-bold">{title}:</p>
    <p>{children}</p>
  </div>
);
