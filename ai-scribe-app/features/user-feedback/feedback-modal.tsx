import { useState } from "react";

import { Button } from "@heroui/button";
import { Textarea } from "@heroui/input";
import { Link } from "@heroui/link";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/modal";

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
            Submit your feedback below or email the project team at:
            <Link
              className="ms-3 text-sm"
              href="mailto:digitalscribe.team@albertahealthservices.ca"
            >
              digitalscribe.team@albertahealthservices.ca
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
