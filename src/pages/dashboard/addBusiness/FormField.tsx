import type { ReactNode } from "react";

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}

export const fieldInputClasses =
  "h-12 w-full bg-elevated border border-white/[0.10] rounded-xl px-4 text-ink placeholder:text-ink-muted outline-none focus:border-primary/50 disabled:opacity-50 disabled:cursor-not-allowed";

export default function FormField({ label, htmlFor, required, error, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink-body">
        {label}
        {required && <span className="text-danger ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-danger mt-1">{error}</p>}
    </div>
  );
}
