import React from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  error?: boolean;
  hint?: string;
};

export default function Input({
  type = "text",
  id,
  name,
  placeholder,
  value,
  defaultValue,
  onChange,
  disabled = false,
  className = "",
  min,
  max,
  step,
  error = false,
  hint,
  ...props
}: InputProps) {
  let inputClasses =
    "h-11 w-full rounded-lg border bg-transparent px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 ";

  if (disabled) {
    inputClasses +=
      "cursor-not-allowed border-gray-300 bg-gray-100 text-gray-500 opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 ";
  } else if (error) {
    inputClasses +=
      "border-error-500 focus:border-error-300 focus:ring-error-500/10 dark:border-error-500 ";
  } else {
    inputClasses +=
      "border-gray-300 focus:border-brand-300 focus:ring-brand-500/10 dark:border-gray-700 dark:focus:border-brand-800 ";
  }

  return (
    <div>
      <input
        type={type}
        id={id}
        name={name}
        placeholder={placeholder}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        className={`${inputClasses} ${className}`}
        {...props}
      />

      {hint && (
        <p
          className={`mt-1.5 text-xs ${
            error
              ? "text-error-500"
              : "text-gray-500 dark:text-gray-400"
          }`}
        >
          {hint}
        </p>
      )}
    </div>
  );
}