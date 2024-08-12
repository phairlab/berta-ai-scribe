import { Spinner } from "@nextui-org/spinner";

export const SimpleLoadingMessage = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <div className="flex flex-row gap-4 justify-center items-center">
      <Spinner color="default" size="md" />
      <span className="text-zinc-500">{children}</span>
    </div>
  );
};
