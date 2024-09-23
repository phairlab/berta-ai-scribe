import { Link } from "@nextui-org/link";
import { Spinner } from "@nextui-org/spinner";

type ActionWaitSpinnerProps = {
  onCancel?: () => void;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
};

export const ActionWaitSpinner = ({
  onCancel,
  children,
  size = "md",
}: ActionWaitSpinnerProps) => {
  return (
    <div className="flex flex-row gap-3 items-center justify-center">
      <div className="flex flex-row gap-4 justify-center items-center">
        <Spinner color="default" size={size} />
        <span className="text-zinc-500">{children}</span>
      </div>
      {onCancel && (
        <Link className="text-blue-500" href="#" onClick={onCancel}>
          (Cancel)
        </Link>
      )}
    </div>
  );
};
