import React from "react";

interface FormGroupProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  id: string;
}

/**
 * Approved Layout: Option A (Stacked Compact)
 * - Label directly above input (13px medium, secondary #6B7280)
 * - 36px height input field, 1px solid border (#E5E7EB), 4px border radius, bg #FFFFFF, focus ring #3F3F9E
 * - Error message directly below in 12px red (#DC2626)
 */
export const FormGroup: React.FC<FormGroupProps> = ({
  label,
  error,
  id,
  className = "",
  ...props
}) => {
  return (
    <div className="flex flex-col space-y-1 text-left">
      <label
        htmlFor={id}
        className="text-[13px] font-medium text-primary-muted select-none"
      >
        {label}
      </label>
      <input
        id={id}
        className={`h-9 px-3 text-sm text-primary bg-background border ${
          error ? "border-status-late" : "border-border"
        } rounded focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors disabled:bg-background-subtle disabled:cursor-not-allowed ${className}`}
        {...props}
      />
      {error && (
        <span className="text-[12px] font-normal text-status-late mt-0.5">
          {error}
        </span>
      )}
    </div>
  );
};
