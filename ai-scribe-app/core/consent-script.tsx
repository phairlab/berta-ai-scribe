import { DetailedHTMLProps, HTMLAttributes } from "react";

type ConsentScriptProps = DetailedHTMLProps<
  HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
>;

export const ConsentScript = ({ ...props }: ConsentScriptProps) => (
  <div {...props}>
    <p className="font-bold mb-2">Consent Script:</p>
    <p>
      &quot;I have a new AI tool that listens to our conversation and helps me
      write my notes. I review everything before the notes are placed into your
      chart. Your information may be used for quality improvement. Saying no to
      using the AI tool to record our conversation will have no impact on your
      care. Are you okay with me turning it on?&quot;
    </p>
  </div>
);
