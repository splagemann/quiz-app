"use client";

import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef } from "react";

interface BaseFormInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
}

interface InputProps extends BaseFormInputProps, InputHTMLAttributes<HTMLInputElement> {
  as?: "input";
}

interface TextareaProps extends BaseFormInputProps, TextareaHTMLAttributes<HTMLTextAreaElement> {
  as: "textarea";
}

type FormInputProps = InputProps | TextareaProps;

export const FormInput = forwardRef<HTMLInputElement | HTMLTextAreaElement, FormInputProps>(
  ({ label, error, helperText, required, className = "", as = "input", ...props }, ref) => {
    const inputBaseStyles = "w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 dark:text-gray-100 dark:bg-gray-600 placeholder:text-gray-500 dark:placeholder:text-gray-400 transition";
    const inputErrorStyles = error
      ? "border-red-500 dark:border-red-400"
      : "border-gray-300 dark:border-gray-600";
    const inputCombinedStyles = `${inputBaseStyles} ${inputErrorStyles} ${className}`.trim();

    const id = (props as any).id || (props as any).name;

    return (
      <div className="mb-6">
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2"
          >
            {label}
            {required && <span className="text-red-600 ml-1">*</span>}
          </label>
        )}

        {as === "textarea" ? (
          <textarea
            ref={ref as any}
            id={id}
            className={inputCombinedStyles}
            {...(props as TextareaHTMLAttributes<HTMLTextAreaElement>)}
          />
        ) : (
          <input
            ref={ref as any}
            id={id}
            className={inputCombinedStyles}
            {...(props as InputHTMLAttributes<HTMLInputElement>)}
          />
        )}

        {helperText && !error && (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{helperText}</p>
        )}

        {error && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    );
  }
);

FormInput.displayName = "FormInput";
