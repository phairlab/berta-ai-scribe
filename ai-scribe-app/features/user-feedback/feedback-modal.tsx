import { useState } from "react";

import { Button } from "@nextui-org/button";
import { Textarea } from "@nextui-org/input";
import { Link } from "@nextui-org/link";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@nextui-org/modal";

import { useWebApi } from "@/services/web-api/use-web-api";

type FeedbackModalProps = {
  isOpen: boolean;
  onOpenChange: () => void;
  onClose: () => void;
};

export const FeedbackModal = ({
  isOpen,
  onOpenChange,
  onClose,
}: FeedbackModalProps) => {
  const webApi = useWebApi();
  const [feedbackText, setFeedbackText] = useState<string | null>(null);

  const handleSubmit = () => {
    if (feedbackText) {
      webApi.user.submitFeedback(new Date(), feedbackText);
      setFeedbackText(null);
      onClose();
    }
  };

  const handleCancel = () => {
    setFeedbackText(null);
    onClose();
  };

  return (
    <Modal
      backdrop="blur"
      isOpen={isOpen}
      placement="center"
      scrollBehavior="inside"
      size="lg"
      onOpenChange={onOpenChange}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          Provide Feedback
        </ModalHeader>
        <ModalBody>
          <p className="text-sm mb-3">
            Submit your feedback below or email the project&apos;s primary
            contact at:
            <Link
              className="ms-3 text-sm"
              href="mailto:michael.weldon@albertahealthservices.ca"
            >
              michael.weldon@albertahealthservices.ca
            </Link>
          </p>
          <Textarea
            isRequired
            label="Details"
            labelPlacement="outside"
            maxRows={25}
            minRows={10}
            placeholder="Please enter your feedback here."
            value={feedbackText ?? ""}
            onValueChange={setFeedbackText}
          />
        </ModalBody>
        <ModalFooter>
          <Button
            color="primary"
            isDisabled={!feedbackText}
            onPress={handleSubmit}
          >
            Submit
          </Button>
          <Button color="default" onPress={handleCancel}>
            Cancel
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
