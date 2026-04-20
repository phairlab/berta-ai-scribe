import { HTMLProps } from "react";

import clsx from "clsx";

import { LinkButton } from "@/core/link-button";
import { NoteType } from "@/core/types";

type OptionalNotesSelectorProps = {
  enabledNotes: string[] | undefined;
  availableNotes: NoteType[];
  onChanged: (update: string[]) => void;
} & HTMLProps<HTMLDivElement>;

export const OptionalNotesSelector = ({
  enabledNotes,
  availableNotes,
  onChanged,
  ...props
}: OptionalNotesSelectorProps) => {
  function isEnabled(noteType: NoteType) {
    return (enabledNotes ?? []).includes(noteType.id);
  }

  function toggleNoteType(noteType: NoteType) {
    const enabled = enabledNotes ?? [];

    if (enabled.includes(noteType.id)) {
      onChanged(enabled.filter((nt) => nt !== noteType.id));
    } else {
      onChanged([...enabled, noteType.id].sort());
    }
  }

  return (
    <div {...props}>
      {["Other", "Individual Sections"].map((category) => (
        <div
          key={category}
          className={clsx({
            hidden:
              availableNotes.filter((nt) => nt.category === category).length ===
              0,
          })}
        >
          <h3 className="text-sm text-default-500 mb-2">{category}</h3>
          {availableNotes
            .filter((nt) => nt.category === category)
            .map((noteType) => (
              <div
                key={noteType.id}
                className="flex flex-row gap-5 ps-2 mb-1"
                title={noteType.title}
              >
                <div
                  className={clsx([
                    "basis-full truncate text-ellipsis",
                    isEnabled(noteType)
                      ? "text-foreground"
                      : "text-default-400",
                  ])}
                >
                  {noteType.title}
                </div>
                <LinkButton
                  className={clsx(["text-primary", "text-sm"])}
                  onPress={() => toggleNoteType(noteType)}
                >
                  {isEnabled(noteType) ? "Disable" : "Enable"}
                </LinkButton>
              </div>
            ))}
        </div>
      ))}
    </div>
  );
};
