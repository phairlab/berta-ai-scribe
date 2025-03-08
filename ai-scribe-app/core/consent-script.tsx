import { DetailedHTMLProps, HTMLAttributes } from "react";

import { TitledParagraph } from "./titled-paragraph";

type ConsentScriptProps = DetailedHTMLProps<
  HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
>;

export const ConsentScript = ({ ...props }: ConsentScriptProps) => (
  <TitledParagraph title="Consent Script" {...props}>
    &quot;I have a new AHS tool that records our conversation and uses AI to
    help me write my notes. I review everything before it&apos;s added to your
    chart. Saying no won&apos;t affect your care. Are you okay with me turning
    it on?&quot;
  </TitledParagraph>
);
