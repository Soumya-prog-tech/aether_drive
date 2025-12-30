import React from "react";

export const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      
      {/* LEFT – FORM */}
      <div className="flex items-center justify-center px-6 bg-white">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>

      {/* RIGHT – VISUAL */}
      <div className="hidden lg:flex bg-gradient-to-br from-purple-400 to-indigo-600">
        <div className="flex flex-col justify-center items-center
                        text-white text-center
                        w-full px-12 gap-10">
          
          {/* Text */}
          <div>
            <h2 className="text-3xl font-bold mb-2">
              Secure. Private. Encrypted.
            </h2>
            <p className="text-purple-100 max-w-md mx-auto">
              Your data is encrypted before it ever leaves your device.
            </p>
          </div>

          {/* Illustration */}
          <div className="w-72 h-72 rounded-3xl bg-white/15
                          flex items-center justify-center
                          shadow-xl">
            <span className="text-7xl">🔐</span>
          </div>

        </div>
      </div>

    </div>
  );
};
