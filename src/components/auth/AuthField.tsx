"use client";

import type { ChangeEventHandler, ReactNode } from "react";
import { twMerge } from "tailwind-merge";

import Label from "@/components/form/Label";

interface AuthFieldProps {
  label: string;
  id: string;
  name: string;
  type?: string;
  value: string;
  placeholder?: string;
  autoComplete?: string;
  inputMode?:
    | "none"
    | "text"
    | "tel"
    | "url"
    | "email"
    | "numeric"
    | "decimal"
    | undefined;
  readOnly?: boolean;
  disabled?: boolean;
  error?: string;
  hint?: string;
  trailingElement?: ReactNode;
  onChange: ChangeEventHandler<HTMLInputElement>;
}

export default function AuthField({
  label,
  id,
  name,
  type = "text",
  value,
  placeholder,
  autoComplete,
  inputMode,
  readOnly = false,
  disabled = false,
  error,
  hint,
  trailingElement,
  onChange,
}: AuthFieldProps) {
  const hasError = Boolean(error);

  return (
    <div>
      <Label htmlFor={id}>
        {label} <span className="text-error-500">*</span>
      </Label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={type}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          inputMode={inputMode}
          readOnly={readOnly}
          disabled={disabled}
          onChange={onChange}
          aria-invalid={hasError}
          aria-describedby={hint || hasError ? `${id}-hint` : undefined}
          className={twMerge(
            "h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800",
            trailingElement ? "pr-12" : "",
            disabled
              ? "cursor-not-allowed border-gray-300 bg-gray-100 text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
              : hasError
                ? "border-error-500 text-error-800 focus:border-error-500 focus:ring-error-500/10 dark:border-error-500 dark:text-error-400"
                : "border-gray-300 bg-transparent text-gray-800 focus:border-brand-300 focus:ring-brand-500/10 dark:border-gray-700 dark:focus:border-brand-800",
          )}
        />
        {trailingElement ? (
          <div className="absolute inset-y-0 right-3 flex items-center">
            {trailingElement}
          </div>
        ) : null}
      </div>
      {hint || error ? (
        <p
          id={`${id}-hint`}
          className={twMerge(
            "mt-1.5 text-xs",
            hasError ? "text-error-500" : "text-gray-500",
          )}
        >
          {error ?? hint}
        </p>
      ) : null}
    </div>
  );
}
