import React from "react";

interface Props {
  children: React.ReactNode;
}

export const AuthLayout = ({ children }: Props) => {
  return (
    <div className="min-h-screen bg-[#0b1220] flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-300">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-blue-600/20">
            <span className="text-2xl">☁️</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Aether Drive
          </h2>
          <p className="text-gray-500 text-sm mt-2">
            End-to-end encrypted storage
          </p>
        </div>

        <div className="bg-[#1e293b]/50 backdrop-blur-xl border border-gray-800 rounded-2xl p-8 shadow-2xl">
          {children}
        </div>
      </div>
    </div>
  );
};

