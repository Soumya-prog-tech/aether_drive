// src/components/ui/AuthInput.tsx
import React from "react";

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const AuthInput = ({ label, ...props }: Props) => {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-300">
        {label}
      </label>
      <input
        {...props}
        className="
          block w-full rounded-lg border border-gray-700 bg-[#0f172a] 
          text-white placeholder-gray-500
          focus:border-blue-500 focus:ring-1 focus:ring-blue-500 
          px-3 py-2 text-sm transition-colors
          disabled:opacity-50 disabled:cursor-not-allowed
        "
      />
    </div>
  );
};
