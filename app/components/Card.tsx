import { HTMLAttributes } from "react";

export type CardVariant = "default" | "form" | "gradient";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  children: React.ReactNode;
}

const variantStyles: Record<CardVariant, string> = {
  default: "bg-white dark:bg-gray-800 shadow dark:shadow-gray-700/50",
  form: "bg-gray-200 dark:bg-gray-700 shadow dark:shadow-gray-700/50",
  gradient: "bg-white shadow-2xl",
};

export function Card({ variant = "default", className = "", children, ...props }: CardProps) {
  const baseStyles = "rounded-lg";
  const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${className}`.trim();

  return (
    <div className={combinedClassName} {...props}>
      {children}
    </div>
  );
}
