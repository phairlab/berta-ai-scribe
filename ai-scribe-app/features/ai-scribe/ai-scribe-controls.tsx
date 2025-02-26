import { useState } from "react";

import clsx from "clsx";

import { Button } from "@nextui-org/button";
import {
  Link,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Textarea,
  useDisclosure,
} from "@nextui-org/react";

import { NoteTypeSelector } from "@/core/note-type-selector";
import { NoteType } from "@/core/types";
import { useNoteTypes } from "@/services/state/note-types-context";

const MAX_CONTEXT_LENGTH = 4000;

type AIScribeControlsProps = {
  context: string | null;
  isDisabled: boolean;
  isRegenerate: boolean;
  selectedNoteType?: NoteType;
  onNoteTypeChanged: (noteType: NoteType | undefined) => void;
  onContextChanged: (context: string | null) => void;
  onSubmit: () => void;
};

export const AIScribeControls = ({
  context = null,
  isDisabled,
  isRegenerate,
  selectedNoteType,
  onNoteTypeChanged,
  onContextChanged,
  onSubmit,
}: AIScribeControlsProps) => {
  const noteTypes = useNoteTypes();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const [draftContext, setDraftContext] = useState<string | null>(null);

  const handleOpen = () => {
    setDraftContext(context);
    onOpen();
  };

  const handleClose = () => {
    onContextChanged(draftContext);
    setDraftContext(null);
    onClose();
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className="flex flex-col md:flex-row items-end md:items-center md:justify-center gap-4">
        <NoteTypeSelector
          builtinTypes={noteTypes.builtin}
          className="w-[300px]"
          customTypes={noteTypes.custom}
          isDisabled={noteTypes.initState !== "Ready"}
          isLoading={noteTypes.initState === "Initializing"}
          placeholder="Select a Note Type"
          selected={selectedNoteType}
          onChange={onNoteTypeChanged}
        />
        <div className="flex flex-row-reverse md:flex-row  gap-4">
          <Button
            color="primary"
            isDisabled={isDisabled}
            size="md"
            onPress={onSubmit}
          >
            {isRegenerate ? "Regenerate Note" : "Generate Note"}
          </Button>
          <Link className="text-sm cursor-pointer" onPress={handleOpen}>
            {context ? "Update Context" : "Add Context"}
          </Link>
        </div>
      </div>
      <Modal
        backdrop="blur"
        isOpen={isOpen}
        placement="center"
        scrollBehavior="inside"
        size="2xl"
        onOpenChange={isOpen ? handleClose : handleOpen}
      >
        <ModalContent>
          <ModalHeader>Context</ModalHeader>
          <ModalBody>
            <p className="text-sm">
              Any details added below will be used when generating notes for
              this recording. Existing notes must be regenerated before changes
              are applied.
            </p>
            <Textarea
              isRequired
              label="Details"
              labelPlacement="outside"
              maxRows={30}
              minRows={10}
              placeholder="Enter any other relevant details here"
              value={draftContext ?? ""}
              onValueChange={(value) =>
                value.length > 0
                  ? setDraftContext(value.substring(0, MAX_CONTEXT_LENGTH))
                  : setDraftContext(null)
              }
            />
          </ModalBody>
          <ModalFooter>
            <div className="flex flex-row justify-between gap-2 w-full">
              <div
                className={clsx(
                  "justify-self-start self-center text-sm ms-4",
                  (draftContext?.length ?? 0) < MAX_CONTEXT_LENGTH
                    ? "text-zinc-500"
                    : "text-primary-500",
                )}
              >
                {draftContext?.length ?? 0} / {MAX_CONTEXT_LENGTH}
              </div>
              <div className="flex flex-row gap-2">
                <Button color="default" onPress={() => setDraftContext(null)}>
                  Clear
                </Button>
                <Button color="primary" onPress={handleClose}>
                  Close
                </Button>
              </div>
            </div>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};
