import { Toaster as SonnerToaster } from "sonner";

export default function Toaster() {
  return (
    <SonnerToaster
      theme="dark"
      position="top-right"
      toastOptions={{
        classNames: {
          toast: "!bg-card !border !border-white/[0.08] !text-ink !shadow-[0_8px_32px_rgba(0,0,0,0.3)]",
          title: "!text-ink",
          description: "!text-ink-muted",
          actionButton: "!bg-primary !text-white",
          cancelButton: "!bg-white/[0.08] !text-ink-muted",
        },
      }}
    />
  );
}
