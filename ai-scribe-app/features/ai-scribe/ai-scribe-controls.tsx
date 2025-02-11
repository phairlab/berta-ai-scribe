import { useState } from "react";

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

  const [details, setDetails] = useState<string | null>(null);

  const handleOpen = () => {
    setDetails(context);
    onOpen();
  };

  const handleClose = () => {
    onContextChanged(details);
    setDetails(null);
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
            {context ? "Update Details" : "Add Details"}
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
          <ModalHeader>Other Details</ModalHeader>
          <ModalBody>
            <Textarea
              isRequired
              label="Instructions"
              labelPlacement="outside"
              maxRows={30}
              minRows={10}
              placeholder="Enter any other relevant details here"
              value={details ?? ""}
              onValueChange={(value) =>
                value.length > 0 ? setDetails(value) : setDetails(null)
              }
            />
          </ModalBody>
          <ModalFooter>
            <Button color="default" onPress={() => setDetails(null)}>
              Clear
            </Button>
            <Button color="primary" onPress={handleClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};
