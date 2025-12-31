// src/components/uimport React from "react";
import { Loader2 } from "lucide-react";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  children: React.ReactNode;
}

export const AuthButton = ({ loading, children, className, ...props }: Props) => {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={`
        w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg 
        shadow-lg shadow-blue-600/20 text-sm font-medium text-white 
        bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 
        focus:ring-offset-[#1e293b] disabled:opacity-50 disabled:cursor-not-allowed transition-all
        ${className}
      `}
    >
      {loading ? <Loader2 className="animate-spin w-5 h-5" /> : children}
    </button>
  );
};
