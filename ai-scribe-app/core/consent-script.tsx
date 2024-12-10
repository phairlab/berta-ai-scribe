import { DetailedHTMLProps, HTMLAttributes } from "react";

import { TitledParagraph } from "./titled-paragraph";

type ConsentScriptProps = DetailedHTMLProps<
  HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
>;

export const ConsentScript = ({ ...props }: ConsentScriptProps) => (
  <TitledParagraph title="Consent Script" {...props}>
    &quot;I have a new AI tool that listens to our conversation and helps me
    write my notes. I review everything before the notes are placed into your
    chart. Your information may be used for quality improvement. Saying no to
    using the AI tool to record our conversation will have no impact on your
    care. Are you okay with me turning it on?&quot;
  </TitledParagraph>
);
